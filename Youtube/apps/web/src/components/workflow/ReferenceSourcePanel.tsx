/**
 * Reference Source Panel
 *
 * Manages reference sources for workflow:
 * - Image style references
 * - Example videos
 * - Text style guides
 *
 * Features:
 * - Drag & drop upload
 * - URL import
 * - Preview
 * - Apply to specific agents
 */

"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  Image,
  Video,
  FileText,
  Palette,
  Plus,
  X,
  Link,
  Upload,
  Eye,
  Target,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export type ReferenceSourceType = "image" | "video" | "style" | "text";

export interface ReferenceSource {
  id: string;
  type: ReferenceSourceType;
  name: string;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
  appliedTo?: string[]; // Agent IDs
  createdAt: string;
}

interface ReferenceSourcePanelProps {
  sources: ReferenceSource[];
  onAdd: (source: Omit<ReferenceSource, "id" | "createdAt">) => void;
  onRemove: (id: string) => void;
  onApply: (sourceId: string, agentId: string) => void;
  onRemoveApplication: (sourceId: string, agentId: string) => void;
  disabled?: boolean;
}

const TYPE_CONFIG: Record<ReferenceSourceType, { label: string; icon: React.ElementType; color: string }> = {
  image: { label: "이미지 스타일", icon: Image, color: "text-purple-500 bg-purple-100 dark:bg-purple-900/30" },
  video: { label: "예시 영상", icon: Video, color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30" },
  style: { label: "스타일 가이드", icon: Palette, color: "text-pink-500 bg-pink-100 dark:bg-pink-900/30" },
  text: { label: "텍스트 스타일", icon: FileText, color: "text-green-500 bg-green-100 dark:bg-green-900/30" },
};

const APPLICABLE_AGENTS: Record<ReferenceSourceType, { id: string; name: string }[]> = {
  image: [
    { id: "video", name: "영상 생성" },
    { id: "thumbnail", name: "썸네일 생성" },
  ],
  video: [
    { id: "editor", name: "영상 편집" },
    { id: "video", name: "영상 생성" },
  ],
  style: [
    { id: "video", name: "영상 생성" },
    { id: "thumbnail", name: "썸네일 생성" },
  ],
  text: [
    { id: "script", name: "스크립트 작성" },
  ],
};

export function ReferenceSourcePanel({
  sources,
  onAdd,
  onRemove,
  onApply,
  onRemoveApplication,
  disabled = false,
}: ReferenceSourcePanelProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSourceType, setNewSourceType] = useState<ReferenceSourceType>("image");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceName, setNewSourceName] = useState("");
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      files.forEach((file) => {
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
          ? "video"
          : "text";

        onAdd({
          type,
          name: file.name,
          url,
          thumbnailUrl: type === "image" ? url : undefined,
        });
      });
    },
    [disabled, onAdd]
  );

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach((file) => {
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
          ? "video"
          : "text";

        onAdd({
          type,
          name: file.name,
          url,
          thumbnailUrl: type === "image" ? url : undefined,
        });
      });
    },
    [onAdd]
  );

  // Handle URL add
  const handleAddUrl = () => {
    if (!newSourceUrl) return;

    onAdd({
      type: newSourceType,
      name: newSourceName || newSourceUrl.split("/").pop() || "Reference",
      url: newSourceUrl,
      thumbnailUrl: newSourceType === "image" ? newSourceUrl : undefined,
    });

    setNewSourceUrl("");
    setNewSourceName("");
    setIsAddingNew(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">참조 소스</h3>
        <button
          onClick={() => setIsAddingNew(!isAddingNew)}
          disabled={disabled}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50"
        >
          <Plus className="w-3 h-3" />
          추가
        </button>
      </div>

      {/* Add New Source Form */}
      {isAddingNew && (
        <div className="p-3 border rounded-lg space-y-3 bg-muted/50">
          {/* Type Selection */}
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(TYPE_CONFIG) as ReferenceSourceType[]).map((type) => {
              const config = TYPE_CONFIG[type];
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  onClick={() => setNewSourceType(type)}
                  className={`
                    p-2 rounded-lg border text-center transition-all
                    ${newSourceType === type
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30"
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 mx-auto mb-1 ${config.color.split(" ")[0]}`} />
                  <span className="text-xs">{config.label}</span>
                </button>
              );
            })}
          </div>

          {/* URL Input */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="URL 입력..."
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 border rounded-md hover:bg-muted"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="이름 (선택사항)"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsAddingNew(false)}
              className="px-3 py-1.5 text-xs rounded-md hover:bg-muted"
            >
              취소
            </button>
            <button
              onClick={handleAddUrl}
              disabled={!newSourceUrl}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              추가
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.txt,.md"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-4 text-center transition-colors
          ${isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/20 hover:border-muted-foreground/40"
          }
          ${disabled ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          파일을 드래그하여 추가하거나 클릭하세요
        </p>
      </div>

      {/* Source List */}
      <div className="space-y-2">
        {sources.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            추가된 참조 소스가 없습니다
          </p>
        ) : (
          sources.map((source) => {
            const config = TYPE_CONFIG[source.type];
            const Icon = config.icon;
            const isExpanded = expandedSource === source.id;
            const applicableAgents = APPLICABLE_AGENTS[source.type];

            return (
              <div
                key={source.id}
                className="border rounded-lg overflow-hidden"
              >
                {/* Header */}
                <div
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 ${config.color.split(" ").slice(1).join(" ")}`}
                  onClick={() => setExpandedSource(isExpanded ? null : source.id)}
                >
                  <Icon className={`w-4 h-4 ${config.color.split(" ")[0]}`} />

                  {/* Preview */}
                  {source.thumbnailUrl && (
                    <img
                      src={source.thumbnailUrl}
                      alt={source.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{source.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {config.label}
                      {source.appliedTo && source.appliedTo.length > 0 && (
                        <span className="ml-2 text-primary">
                          {source.appliedTo.length}개 에이전트에 적용됨
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded hover:bg-background"
                    >
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(source.id);
                      }}
                      className="p-1 rounded hover:bg-background text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-3 border-t space-y-3">
                    <h5 className="text-xs font-medium flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      적용할 에이전트
                    </h5>

                    <div className="flex flex-wrap gap-2">
                      {applicableAgents.map((agent) => {
                        const isApplied = source.appliedTo?.includes(agent.id);
                        return (
                          <button
                            key={agent.id}
                            onClick={() =>
                              isApplied
                                ? onRemoveApplication(source.id, agent.id)
                                : onApply(source.id, agent.id)
                            }
                            className={`
                              px-2 py-1 text-xs rounded-md border transition-all
                              ${isApplied
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-muted hover:border-muted-foreground/30"
                              }
                            `}
                          >
                            {agent.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* URL Display */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Link className="w-3 h-3" />
                      <span className="truncate">{source.url}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ReferenceSourcePanel;
