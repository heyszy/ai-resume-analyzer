"use client";

import { PencilLine, Plus, Trash2 } from "lucide-react";
import { type Dispatch, type ReactNode, type SetStateAction, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CandidateProfileUpdateInput } from "@/lib/candidates";

import {
  buildCandidateProfileUpdateInput,
  type CandidateProfileEditorDraft,
  createCandidateProfileEditorDraft,
  createEmptyEducationItem,
  createEmptyProjectExperienceItem,
  createEmptyWorkExperienceItem,
} from "./candidate-profile-editor";
import type { WorkspaceCandidate, WorkspaceCandidateSummary } from "./workspace-model";

type CandidateProfileEditableCandidate = Pick<
  WorkspaceCandidateSummary,
  "displayName" | "phone" | "email" | "city" | "skillTags"
> & {
  profile?: WorkspaceCandidate["profile"] | null;
};

type CandidateProfileEditorDialogProps = {
  candidate: CandidateProfileEditableCandidate;
  open: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CandidateProfileUpdateInput) => Promise<void>;
};

export function CandidateProfileEditorDialog({
  candidate,
  open,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: CandidateProfileEditorDialogProps) {
  const [draft, setDraft] = useState<CandidateProfileEditorDraft>(() =>
    createCandidateProfileEditorDraft(candidate),
  );
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(createCandidateProfileEditorDraft(candidate));
    setFormErrorMessage(null);
  }, [candidate, open]);

  async function handleSubmit() {
    const payload = buildCandidateProfileUpdateInput(draft);

    try {
      setFormErrorMessage(null);
      await onSubmit(payload);
      onOpenChange(false);
    } catch (error) {
      setFormErrorMessage(error instanceof Error ? error.message : "保存候选人简历失败。");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="编辑简历"
      description="人工修正 AI 解析结果，保存后会同步更新详情页和候选人列表。"
      className="max-w-5xl"
      bodyClassName="max-h-[calc(100vh-10rem)] overflow-y-auto"
    >
      <div className="space-y-6">
        <section className="space-y-4">
          <SectionTitle title="基本信息" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="姓名" htmlFor="candidate-profile-name">
              <Input
                id="candidate-profile-name"
                value={draft.basicInfo.name ?? ""}
                onChange={(event) =>
                  setDraft((state) => ({
                    ...state,
                    basicInfo: {
                      ...state.basicInfo,
                      name: event.target.value,
                    },
                  }))
                }
                placeholder="请输入姓名"
              />
            </Field>

            <Field label="电话" htmlFor="candidate-profile-phone">
              <Input
                id="candidate-profile-phone"
                value={draft.basicInfo.phone ?? ""}
                onChange={(event) =>
                  setDraft((state) => ({
                    ...state,
                    basicInfo: {
                      ...state.basicInfo,
                      phone: event.target.value,
                    },
                  }))
                }
                placeholder="请输入电话"
              />
            </Field>

            <Field label="邮箱" htmlFor="candidate-profile-email">
              <Input
                id="candidate-profile-email"
                type="email"
                value={draft.basicInfo.email ?? ""}
                onChange={(event) =>
                  setDraft((state) => ({
                    ...state,
                    basicInfo: {
                      ...state.basicInfo,
                      email: event.target.value,
                    },
                  }))
                }
                placeholder="请输入邮箱"
              />
            </Field>

            <Field label="城市" htmlFor="candidate-profile-city">
              <Input
                id="candidate-profile-city"
                value={draft.basicInfo.city ?? ""}
                onChange={(event) =>
                  setDraft((state) => ({
                    ...state,
                    basicInfo: {
                      ...state.basicInfo,
                      city: event.target.value,
                    },
                  }))
                }
                placeholder="请输入所在城市"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle title="技能标签" />
          <Field label="技能列表" htmlFor="candidate-profile-skill-tags">
            <Textarea
              id="candidate-profile-skill-tags"
              value={draft.skillTagsText}
              onChange={(event) =>
                setDraft((state) => ({
                  ...state,
                  skillTagsText: event.target.value,
                }))
              }
              placeholder="每行一个技能，或使用逗号分隔"
              className="min-h-28"
            />
          </Field>
        </section>

        <ArraySectionHeader
          title="教育经历"
          actionLabel="新增教育经历"
          onAdd={() =>
            setDraft((state) => ({
              ...state,
              educationHistory: [...state.educationHistory, createEmptyEducationItem()],
            }))
          }
        />
        {draft.educationHistory.length > 0 ? (
          <div className="space-y-3">
            {draft.educationHistory.map((item, index) => (
              <EditableCard
                key={item.tempId}
                title={`教育经历 ${index + 1}`}
                onRemove={() =>
                  setDraft((state) => ({
                    ...state,
                    educationHistory: state.educationHistory.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="学校" htmlFor={`education-school-${index}`}>
                    <Input
                      id={`education-school-${index}`}
                      value={item.school ?? ""}
                      onChange={(event) =>
                        updateEducationField(setDraft, index, "school", event.target.value)
                      }
                      placeholder="请输入学校"
                    />
                  </Field>
                  <Field label="专业" htmlFor={`education-major-${index}`}>
                    <Input
                      id={`education-major-${index}`}
                      value={item.major ?? ""}
                      onChange={(event) =>
                        updateEducationField(setDraft, index, "major", event.target.value)
                      }
                      placeholder="请输入专业"
                    />
                  </Field>
                  <Field label="学历" htmlFor={`education-degree-${index}`}>
                    <Input
                      id={`education-degree-${index}`}
                      value={item.degree ?? ""}
                      onChange={(event) =>
                        updateEducationField(setDraft, index, "degree", event.target.value)
                      }
                      placeholder="请输入学历"
                    />
                  </Field>
                  <Field label="毕业时间" htmlFor={`education-graduation-${index}`}>
                    <Input
                      id={`education-graduation-${index}`}
                      value={item.graduationTime ?? ""}
                      onChange={(event) =>
                        updateEducationField(setDraft, index, "graduationTime", event.target.value)
                      }
                      placeholder="例如：2023-06"
                    />
                  </Field>
                </div>
              </EditableCard>
            ))}
          </div>
        ) : (
          <EmptyArrayState text="暂无教育经历，点击上方按钮新增。" />
        )}

        <ArraySectionHeader
          title="工作经历"
          actionLabel="新增工作经历"
          onAdd={() =>
            setDraft((state) => ({
              ...state,
              workExperiences: [...state.workExperiences, createEmptyWorkExperienceItem()],
            }))
          }
        />
        {draft.workExperiences.length > 0 ? (
          <div className="space-y-3">
            {draft.workExperiences.map((item, index) => (
              <EditableCard
                key={item.tempId}
                title={`工作经历 ${index + 1}`}
                onRemove={() =>
                  setDraft((state) => ({
                    ...state,
                    workExperiences: state.workExperiences.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="公司名称" htmlFor={`work-company-${index}`}>
                    <Input
                      id={`work-company-${index}`}
                      value={item.companyName ?? ""}
                      onChange={(event) =>
                        updateWorkField(setDraft, index, "companyName", event.target.value)
                      }
                      placeholder="请输入公司名称"
                    />
                  </Field>
                  <Field label="职位" htmlFor={`work-position-${index}`}>
                    <Input
                      id={`work-position-${index}`}
                      value={item.position ?? ""}
                      onChange={(event) =>
                        updateWorkField(setDraft, index, "position", event.target.value)
                      }
                      placeholder="请输入职位"
                    />
                  </Field>
                  <Field label="时间段" htmlFor={`work-time-range-${index}`}>
                    <Input
                      id={`work-time-range-${index}`}
                      value={item.timeRange ?? ""}
                      onChange={(event) =>
                        updateWorkField(setDraft, index, "timeRange", event.target.value)
                      }
                      placeholder="例如：2022-01 至 2024-03"
                    />
                  </Field>
                  <div />
                  <Field
                    label="工作内容摘要"
                    htmlFor={`work-summary-${index}`}
                    className="md:col-span-2"
                  >
                    <Textarea
                      id={`work-summary-${index}`}
                      value={item.summary ?? ""}
                      onChange={(event) =>
                        updateWorkField(setDraft, index, "summary", event.target.value)
                      }
                      placeholder="请输入工作内容摘要"
                    />
                  </Field>
                </div>
              </EditableCard>
            ))}
          </div>
        ) : (
          <EmptyArrayState text="暂无工作经历，点击上方按钮新增。" />
        )}

        <ArraySectionHeader
          title="项目经历"
          actionLabel="新增项目经历"
          onAdd={() =>
            setDraft((state) => ({
              ...state,
              projectExperiences: [...state.projectExperiences, createEmptyProjectExperienceItem()],
            }))
          }
        />
        {draft.projectExperiences.length > 0 ? (
          <div className="space-y-3">
            {draft.projectExperiences.map((item, index) => (
              <EditableCard
                key={item.tempId}
                title={`项目经历 ${index + 1}`}
                onRemove={() =>
                  setDraft((state) => ({
                    ...state,
                    projectExperiences: state.projectExperiences.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
              >
                <div className="grid gap-4">
                  <Field label="项目名称" htmlFor={`project-name-${index}`}>
                    <Input
                      id={`project-name-${index}`}
                      value={item.projectName ?? ""}
                      onChange={(event) =>
                        updateProjectField(setDraft, index, "projectName", event.target.value)
                      }
                      placeholder="请输入项目名称"
                    />
                  </Field>
                  <Field label="技术栈" htmlFor={`project-tech-stack-${index}`}>
                    <Textarea
                      id={`project-tech-stack-${index}`}
                      value={item.techStack.join("\n")}
                      onChange={(event) =>
                        updateProjectListField(setDraft, index, "techStack", event.target.value)
                      }
                      placeholder="每行一个技术栈，或使用逗号分隔"
                    />
                  </Field>
                  <Field label="个人职责" htmlFor={`project-responsibilities-${index}`}>
                    <Textarea
                      id={`project-responsibilities-${index}`}
                      value={item.responsibilities.join("\n")}
                      onChange={(event) =>
                        updateProjectListField(
                          setDraft,
                          index,
                          "responsibilities",
                          event.target.value,
                        )
                      }
                      placeholder="每行一条职责，或使用逗号分隔"
                    />
                  </Field>
                  <Field label="项目亮点" htmlFor={`project-highlights-${index}`}>
                    <Textarea
                      id={`project-highlights-${index}`}
                      value={item.highlights.join("\n")}
                      onChange={(event) =>
                        updateProjectListField(setDraft, index, "highlights", event.target.value)
                      }
                      placeholder="每行一条亮点，或使用逗号分隔"
                    />
                  </Field>
                </div>
              </EditableCard>
            ))}
          </div>
        ) : (
          <EmptyArrayState text="暂无项目经历，点击上方按钮新增。" />
        )}

        <section className="space-y-4">
          <SectionTitle title="解析备注" />
          <Field label="备注内容" htmlFor="candidate-profile-extraction-notes">
            <Textarea
              id="candidate-profile-extraction-notes"
              value={draft.extractionNotes}
              onChange={(event) =>
                setDraft((state) => ({
                  ...state,
                  extractionNotes: event.target.value,
                }))
              }
              placeholder="请输入对解析结果的补充说明"
              className="min-h-28"
            />
          </Field>
        </section>

        {formErrorMessage ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formErrorMessage}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
            <PencilLine className="size-4" />
            {isSubmitting ? "保存中..." : "保存修改"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h3 className="text-base font-semibold text-slate-950">{title}</h3>;
}

function ArraySectionHeader({
  title,
  actionLabel,
  onAdd,
}: {
  title: string;
  actionLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <SectionTitle title={title} />
      <Button type="button" variant="outline" size="sm" onClick={onAdd}>
        <Plus className="size-3.5" />
        {actionLabel}
      </Button>
    </div>
  );
}

function EditableCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 px-4 py-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-950">{title}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRemove}>
          <Trash2 className="size-3.5" />
          删除
        </Button>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className} htmlFor={htmlFor}>
      <span className="mb-2 block text-sm font-medium text-slate-950">{label}</span>
      {children}
    </label>
  );
}

function EmptyArrayState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function updateEducationField(
  setDraft: Dispatch<SetStateAction<CandidateProfileEditorDraft>>,
  index: number,
  field: keyof CandidateProfileEditorDraft["educationHistory"][number],
  value: string,
) {
  setDraft((state) => ({
    ...state,
    educationHistory: state.educationHistory.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    ),
  }));
}

function updateWorkField(
  setDraft: Dispatch<SetStateAction<CandidateProfileEditorDraft>>,
  index: number,
  field: keyof CandidateProfileEditorDraft["workExperiences"][number],
  value: string,
) {
  setDraft((state) => ({
    ...state,
    workExperiences: state.workExperiences.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    ),
  }));
}

function updateProjectField(
  setDraft: Dispatch<SetStateAction<CandidateProfileEditorDraft>>,
  index: number,
  field: "projectName",
  value: string,
) {
  setDraft((state) => ({
    ...state,
    projectExperiences: state.projectExperiences.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    ),
  }));
}

function updateProjectListField(
  setDraft: Dispatch<SetStateAction<CandidateProfileEditorDraft>>,
  index: number,
  field: "techStack" | "responsibilities" | "highlights",
  value: string,
) {
  setDraft((state) => ({
    ...state,
    projectExperiences: state.projectExperiences.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: splitMultilineText(value) } : item,
    ),
  }));
}

function splitMultilineText(value: string) {
  return value
    .split(/[\n,，]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
