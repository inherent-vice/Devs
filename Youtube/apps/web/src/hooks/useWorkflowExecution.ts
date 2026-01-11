/**
 * useWorkflowExecution Hook
 *
 * React hook for managing workflow execution with SSE streaming.
 * Provides:
 * - Start/pause/resume/cancel controls
 * - Real-time progress updates
 * - Agent result modification
 * - Error handling
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { WorkflowConfig, WorkflowPhase } from "@/lib/workflow/types";
import type {
  ExecutionMode,
  ExecutionProgress,
  AgentExecutionResult,
  LogEntry,
  ExecutionResult,
  SSEMessage,
} from "@/lib/workflow/executor";

export interface WorkflowExecutionState {
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  hasError: boolean;
  error?: string;
  sessionId?: string;
  progress?: ExecutionProgress;
  result?: ExecutionResult;
  logs: LogEntry[];
}

export interface WorkflowExecutionActions {
  start: (config: WorkflowConfig, options?: StartOptions) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  cancel: () => Promise<void>;
  modifyOutput: (agentId: string, output: unknown) => Promise<void>;
  rerunAgent: (agentId: string, input?: unknown) => Promise<AgentExecutionResult>;
  reset: () => void;
  getAgentResult: (agentId: string) => AgentExecutionResult | undefined;
}

export interface StartOptions {
  mode?: ExecutionMode;
  startFromPhase?: WorkflowPhase;
  skipAgents?: string[];
}

const initialState: WorkflowExecutionState = {
  isRunning: false,
  isPaused: false,
  isCompleted: false,
  isCancelled: false,
  hasError: false,
  logs: [],
};

export function useWorkflowExecution(): [WorkflowExecutionState, WorkflowExecutionActions] {
  const [state, setState] = useState<WorkflowExecutionState>(initialState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Start workflow execution
  const start = useCallback(async (config: WorkflowConfig, options: StartOptions = {}) => {
    // Reset state
    setState({
      ...initialState,
      isRunning: true,
    });

    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      // Create abort controller for fetch
      abortControllerRef.current = new AbortController();

      // Start execution via POST request
      const response = await fetch("/api/workflow/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          mode: options.mode || "auto",
          startFromPhase: options.startFromPhase,
          skipAgents: options.skipAgents,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start workflow");
      }

      // Get session ID from header
      const sessionId = response.headers.get("X-Session-Id");
      if (sessionId) {
        sessionIdRef.current = sessionId;
        setState((prev) => ({ ...prev, sessionId }));
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      const processLine = (line: string) => {
        if (!line.startsWith("data: ")) return;

        try {
          const data = JSON.parse(line.slice(6)) as SSEMessage;
          handleSSEMessage(data);
        } catch (e) {
          console.warn("Failed to parse SSE message:", line, e);
        }
      };

      // Read stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          processLine(line);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Request was cancelled
        return;
      }

      console.error("Workflow execution error:", error);
      setState((prev) => ({
        ...prev,
        isRunning: false,
        hasError: true,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, []);

  // Handle SSE messages
  const handleSSEMessage = useCallback((message: SSEMessage) => {
    switch (message.type) {
      case "connected":
        const connData = message.data as { sessionId: string };
        sessionIdRef.current = connData.sessionId;
        setState((prev) => ({ ...prev, sessionId: connData.sessionId }));
        break;

      case "progress":
        setState((prev) => ({
          ...prev,
          progress: message.data as ExecutionProgress,
        }));
        break;

      case "log":
        setState((prev) => ({
          ...prev,
          logs: [...prev.logs, message.data as LogEntry],
        }));
        break;

      case "paused":
        setState((prev) => ({ ...prev, isPaused: true }));
        break;

      case "resumed":
        setState((prev) => ({ ...prev, isPaused: false }));
        break;

      case "error":
        const errData = message.data as { message: string };
        setState((prev) => ({
          ...prev,
          hasError: true,
          error: errData.message,
        }));
        break;

      case "complete":
        setState((prev) => ({
          ...prev,
          isRunning: false,
          isCompleted: true,
          result: message.data as ExecutionResult,
        }));
        break;

      case "cancelled":
        setState((prev) => ({
          ...prev,
          isRunning: false,
          isCancelled: true,
        }));
        break;
    }
  }, []);

  // Pause execution
  const pause = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      const response = await fetch("/api/workflow/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          action: "pause",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to pause");
      }

      const result = await response.json();
      if (result.progress) {
        setState((prev) => ({
          ...prev,
          isPaused: true,
          progress: result.progress,
        }));
      }
    } catch (error) {
      console.error("Pause error:", error);
    }
  }, []);

  // Resume execution
  const resume = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      const response = await fetch("/api/workflow/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          action: "resume",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to resume");
      }

      const result = await response.json();
      if (result.progress) {
        setState((prev) => ({
          ...prev,
          isPaused: false,
          progress: result.progress,
        }));
      }
    } catch (error) {
      console.error("Resume error:", error);
    }
  }, []);

  // Cancel execution
  const cancel = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!sessionIdRef.current) {
      setState((prev) => ({
        ...prev,
        isRunning: false,
        isCancelled: true,
      }));
      return;
    }

    try {
      await fetch("/api/workflow/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          action: "cancel",
        }),
      });
    } catch (error) {
      console.error("Cancel error:", error);
    }

    setState((prev) => ({
      ...prev,
      isRunning: false,
      isCancelled: true,
    }));
  }, []);

  // Modify agent output
  const modifyOutput = useCallback(async (agentId: string, output: unknown) => {
    if (!sessionIdRef.current) {
      throw new Error("No active session");
    }

    const response = await fetch("/api/workflow/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        action: "modify",
        agentId,
        modifiedOutput: output,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to modify output");
    }

    const result = await response.json();
    if (result.progress) {
      setState((prev) => ({ ...prev, progress: result.progress }));
    }
  }, []);

  // Re-run agent
  const rerunAgent = useCallback(async (agentId: string, input?: unknown): Promise<AgentExecutionResult> => {
    if (!sessionIdRef.current) {
      throw new Error("No active session");
    }

    const response = await fetch("/api/workflow/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        action: "rerun",
        agentId,
        modifiedInput: input,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to rerun agent");
    }

    const result = await response.json();
    if (result.progress) {
      setState((prev) => ({ ...prev, progress: result.progress }));
    }

    return result.result;
  }, []);

  // Reset state
  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    sessionIdRef.current = null;
    setState(initialState);
  }, []);

  // Get agent result
  const getAgentResult = useCallback((agentId: string): AgentExecutionResult | undefined => {
    return state.progress?.agentResults[agentId];
  }, [state.progress]);

  const actions: WorkflowExecutionActions = {
    start,
    pause,
    resume,
    cancel,
    modifyOutput,
    rerunAgent,
    reset,
    getAgentResult,
  };

  return [state, actions];
}

export default useWorkflowExecution;
