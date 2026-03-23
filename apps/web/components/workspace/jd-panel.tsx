"use client";

import { PencilLine, Plus, Sparkles, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { WorkspaceJd } from "./workspace-model";

type JdDraft = Pick<WorkspaceJd, "title" | "description" | "requiredSkills" | "bonusSkills">;

type JdPanelProps = {
  activeJd: WorkspaceJd | null;
  jds: WorkspaceJd[];
  isLoading: boolean;
  panelErrorMessage: string | null;
  onSelectActiveJd: (jdId: string | null) => void;
  onCreateJd: (draft: JdDraft) => Promise<void>;
  onUpdateJd: (jdId: string, draft: JdDraft) => Promise<void>;
  onDeleteJd: (jdId: string) => Promise<void>;
};

const emptyDraft: JdDraft = {
  title: "",
  description: "",
  requiredSkills: [],
  bonusSkills: [],
};

export function JdPanel({
  activeJd,
  jds,
  isLoading,
  panelErrorMessage,
  onSelectActiveJd,
  onCreateJd,
  onUpdateJd,
  onDeleteJd,
}: JdPanelProps) {
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draft, setDraft] = useState<JdDraft>(emptyDraft);
  const [requiredSkillText, setRequiredSkillText] = useState("");
  const [bonusSkillText, setBonusSkillText] = useState("");
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  const isDialogOpen = dialogMode !== null;

  useEffect(() => {
    if (dialogMode === "edit" && activeJd) {
      setDraft({
        title: activeJd.title,
        description: activeJd.description,
        requiredSkills: activeJd.requiredSkills,
        bonusSkills: activeJd.bonusSkills,
      });
      setRequiredSkillText(activeJd.requiredSkills.join("\n"));
      setBonusSkillText(activeJd.bonusSkills.join("\n"));
      setFormErrorMessage(null);
      return;
    }

    if (dialogMode === "create") {
      setDraft(emptyDraft);
      setRequiredSkillText("");
      setBonusSkillText("");
      setFormErrorMessage(null);
    }
  }, [activeJd, dialogMode]);

  function openCreateDialog() {
    setDialogMode("create");
  }

  function openEditDialog() {
    if (!activeJd) {
      return;
    }

    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setFormErrorMessage(null);
  }

  function openDeleteConfirm() {
    if (!activeJd) {
      return;
    }

    setIsDeleteConfirmOpen(true);
  }

  function closeDeleteConfirm() {
    setIsDeleteConfirmOpen(false);
  }

  async function handleDelete() {
    if (!activeJd) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onDeleteJd(activeJd.id);
      closeDeleteConfirm();
    } catch (error) {
      setFormErrorMessage(error instanceof Error ? error.message : "删除职位失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSave() {
    const normalizedTitle = draft.title.trim();
    const normalizedDescription = draft.description.trim();
    const requiredSkills = normalizeSkillInput(requiredSkillText);
    const bonusSkills = normalizeSkillInput(bonusSkillText);

    if (!normalizedTitle || !normalizedDescription || requiredSkills.length === 0) {
      setFormErrorMessage("请填写岗位名称、岗位描述和必备技能。");
      return;
    }

    const nextDraft: JdDraft = {
      title: normalizedTitle,
      description: normalizedDescription,
      requiredSkills,
      bonusSkills,
    };

    try {
      setIsSubmitting(true);
      setFormErrorMessage(null);

      if (dialogMode === "edit" && activeJd) {
        await onUpdateJd(activeJd.id, nextDraft);
      }

      if (dialogMode === "create") {
        await onCreateJd(nextDraft);
      }

      closeDialog();
    } catch (error) {
      setFormErrorMessage(error instanceof Error ? error.message : "保存职位失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-3">
      <Card>
        <div className="space-y-4 px-4 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-950">职位</div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" onClick={openCreateDialog}>
                  <Plus className="size-3.5" />
                  新增
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openEditDialog}
                  disabled={!activeJd}
                >
                  <PencilLine className="size-3.5" />
                  编辑
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openDeleteConfirm}
                  disabled={!activeJd}
                >
                  <Trash2 className="size-3.5" />
                  删除
                </Button>
              </div>
            </div>

            <Select
              value={activeJd?.id ?? ""}
              onValueChange={(value) => onSelectActiveJd(value)}
              disabled={jds.length === 0 || isLoading}
            >
              <SelectTrigger id="active-jd-select-trigger">
                <SelectValue placeholder="选择职位" />
              </SelectTrigger>
              <SelectContent>
                {jds.map((jd) => (
                  <SelectItem key={jd.id} value={jd.id}>
                    {jd.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeJd ? (
            <div className="space-y-4">
              <h2 className="text-[28px] font-semibold leading-tight text-slate-950">
                {activeJd.title}
              </h2>
              <p className="text-sm leading-7 text-muted-foreground">{activeJd.description}</p>

              <TagSection title="必备技能" tags={activeJd.requiredSkills} emphasize />
              <TagSection title="加分技能" tags={activeJd.bonusSkills} />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-950">
                {isLoading ? "正在加载职位" : "暂无职位"}
              </p>
            </div>
          )}

          {panelErrorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {panelErrorMessage}
            </div>
          ) : null}
        </div>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          }
        }}
        title={dialogMode === "edit" ? "编辑职位" : "新增职位"}
      >
        <div className="space-y-4">
          <Field label="岗位名称" htmlFor="jd-title">
            <Input
              id="jd-title"
              value={draft.title}
              onChange={(event) =>
                setDraft((state) => ({
                  ...state,
                  title: event.target.value,
                }))
              }
              placeholder="例如：高级前端工程师"
            />
          </Field>

          <Field label="岗位描述" htmlFor="jd-description">
            <Textarea
              id="jd-description"
              value={draft.description}
              onChange={(event) =>
                setDraft((state) => ({
                  ...state,
                  description: event.target.value,
                }))
              }
              placeholder="请输入岗位职责和要求"
              className="min-h-32"
            />
          </Field>

          <Field label="必备技能" htmlFor="jd-required-skills">
            <Textarea
              id="jd-required-skills"
              value={requiredSkillText}
              onChange={(event) => setRequiredSkillText(event.target.value)}
              placeholder="每行一个技能，或使用逗号分隔"
            />
          </Field>

          <Field label="加分技能" htmlFor="jd-bonus-skills">
            <Textarea
              id="jd-bonus-skills"
              value={bonusSkillText}
              onChange={(event) => setBonusSkillText(event.target.value)}
              placeholder="每行一个技能，或使用逗号分隔"
            />
          </Field>

          {formErrorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formErrorMessage}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "保存中" : "保存"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteConfirm();
          }
        }}
        title="删除职位"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            确认删除
            <span className="font-medium text-slate-950">
              {activeJd ? `「${activeJd.title}」` : "当前职位"}
            </span>
            吗？
          </p>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteConfirm}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "删除中" : "确认删除"}
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-950">
        {label}
      </label>
      {children}
    </div>
  );
}

function TagSection({
  title,
  tags,
  emphasize = false,
}: {
  title: string;
  tags: string[];
  emphasize?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-950">
        <Sparkles className="size-4 text-slate-700" />
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span
              key={tag}
              className={`rounded-full px-3 py-1 text-xs ${
                emphasize
                  ? "bg-slate-950 text-white"
                  : "border border-border bg-muted/60 text-slate-600"
              }`}
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">未填写</span>
        )}
      </div>
    </div>
  );
}

function normalizeSkillInput(value: string) {
  return value
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
