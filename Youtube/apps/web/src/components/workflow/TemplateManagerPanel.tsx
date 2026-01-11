/**
 * Template Manager Panel
 *
 * Manages workflow templates:
 * - Preset templates
 * - Custom (user-saved) templates
 * - Import/Export JSON
 * - Template CRUD operations
 */

"use client";

import React, { useState, useRef } from "react";
import {
  Folder,
  Star,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  Clock,
  Video,
  Search,
  ChevronRight,
  Check,
} from "lucide-react";
import type { WorkflowTemplate, VideoType } from "@/lib/workflow/types";
import { useWorkflowStore, PRESET_TEMPLATES } from "@/lib/workflow/store";

interface TemplateManagerPanelProps {
  onSelectTemplate: (templateId: string) => void;
  selectedTemplateId?: string;
  disabled?: boolean;
}

const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  shorts: "Shorts",
  medium: "중간 길이",
  longform: "장편",
};

export function TemplateManagerPanel({
  onSelectTemplate,
  selectedTemplateId,
  disabled = false,
}: TemplateManagerPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateTags, setNewTemplateTags] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    customTemplates,
    currentConfig,
    saveAsTemplate,
    deleteTemplate,
    getAllTemplates,
    exportConfig,
    importConfig,
  } = useWorkflowStore();

  const allTemplates = getAllTemplates();

  // Filter templates
  const filteredTemplates = allTemplates.filter((template) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.description.toLowerCase().includes(query) ||
      template.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const presetTemplates = filteredTemplates.filter((t) => t.category === "preset");
  const userTemplates = filteredTemplates.filter((t) => t.category === "custom");

  // Save current config as template
  const handleSaveTemplate = () => {
    if (!newTemplateName) return;

    try {
      saveAsTemplate(
        newTemplateName,
        newTemplateDescription,
        newTemplateTags.split(",").map((t) => t.trim()).filter(Boolean)
      );
      setShowSaveDialog(false);
      setNewTemplateName("");
      setNewTemplateDescription("");
      setNewTemplateTags("");
    } catch (error) {
      console.error("Failed to save template:", error);
    }
  };

  // Export template as JSON
  const handleExport = (templateId: string) => {
    const template = allTemplates.find((t) => t.id === templateId);
    if (!template) return;

    const json = JSON.stringify(template.config, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, "_")}_template.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import template from JSON file
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const config = importConfig(json);
        if (config) {
          alert("템플릿을 성공적으로 가져왔습니다.");
        } else {
          alert("템플릿 가져오기에 실패했습니다. JSON 형식을 확인해주세요.");
        }
      } catch (error) {
        alert("템플릿 가져오기에 실패했습니다.");
      }
    };
    reader.readAsText(file);
  };

  // Template card component
  const TemplateCard = ({
    template,
    isPreset,
  }: {
    template: WorkflowTemplate;
    isPreset: boolean;
  }) => {
    const isSelected = selectedTemplateId === template.id;
    const isEditing = editingTemplateId === template.id;

    return (
      <div
        className={`
          relative p-3 rounded-lg border-2 transition-all cursor-pointer
          ${isSelected
            ? "border-primary bg-primary/5"
            : "border-transparent bg-muted/50 hover:bg-muted hover:border-muted-foreground/20"
          }
          ${disabled ? "opacity-50 pointer-events-none" : ""}
        `}
        onClick={() => !disabled && onSelectTemplate(template.id)}
      >
        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2">
            <Check className="w-4 h-4 text-primary" />
          </div>
        )}

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`
              p-2 rounded-lg
              ${isPreset
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                : "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
              }
            `}
          >
            {isPreset ? <Star className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{template.name}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {template.description}
            </p>

            {/* Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-background rounded">
                <Video className="w-3 h-3" />
                {VIDEO_TYPE_LABELS[template.videoType]}
              </span>
              {template.tags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs bg-background rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Actions - only for custom templates */}
        {!isPreset && (
          <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExport(template.id);
              }}
              className="p-1.5 rounded hover:bg-background text-muted-foreground"
              title="내보내기"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("이 템플릿을 삭제하시겠습니까?")) {
                  deleteTemplate(template.id);
                }
              }}
              className="p-1.5 rounded hover:bg-background text-red-500"
              title="삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">템플릿</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground"
            title="가져오기"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!currentConfig || disabled}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            현재 설정 저장
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="템플릿 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Preset Templates */}
      {presetTemplates.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Star className="w-3 h-3" />
            프리셋 템플릿
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {presetTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} isPreset />
            ))}
          </div>
        </div>
      )}

      {/* User Templates */}
      {userTemplates.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Folder className="w-3 h-3" />
            내 템플릿
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {userTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} isPreset={false} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-8">
          {searchQuery ? "검색 결과가 없습니다" : "저장된 템플릿이 없습니다"}
        </p>
      )}

      {/* Save Template Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">템플릿으로 저장</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">이름 *</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="내 템플릿"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <textarea
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="템플릿에 대한 설명"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">태그 (쉼표로 구분)</label>
                <input
                  type="text"
                  value={newTemplateTags}
                  onChange={(e) => setNewTemplateTags(e.target.value)}
                  placeholder="태그1, 태그2, 태그3"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm rounded-md hover:bg-muted"
              >
                취소
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!newTemplateName}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
}

export default TemplateManagerPanel;
