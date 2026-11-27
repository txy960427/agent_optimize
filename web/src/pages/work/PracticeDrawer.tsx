import * as Dialog from "@radix-ui/react-dialog";
import { History, X, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { Investigation } from "../../domain/data";
import { localTime } from "../../api/realData";
import { Badge, Button } from "../../components/ui";
export function PracticeDrawer({
  title,
  description,
  open,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="pt-drawer-overlay" />
        <Dialog.Content className="pt-drawer">
          <header>
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {description ?? "查看相关信息，关闭后返回当前任务。"}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button aria-label="关闭侧栏" className="icon-btn">
                <X size={19} />
              </button>
            </Dialog.Close>
          </header>
          <div className="pt-drawer-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function PracticeHistory({
  investigations,
  onResume,
  initialOpen = false,
}: {
  investigations: Investigation[];
  onResume: (id: string) => void;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  useEffect(() => {
    if (initialOpen) setOpen(true);
  }, [initialOpen]);
  return (
    <>
      <button className="pt-history-trigger" onClick={() => setOpen(true)}>
        <History size={15} />
        历史记录
      </button>
      <PracticeDrawer
        title="分析历史记录"
        description="仅显示当前浏览器保存的分析；不包含其他设备上的记录。"
        open={open}
        onClose={() => setOpen(false)}
      >
        {investigations.length ? (
          investigations.map((inv) => (
            <article className="pt-history-item" key={inv.id}>
              <h3>{inv.symptom || "Trace " + inv.traceId.slice(0, 12)}</h3>
              <p>
                <Badge>
                  {inv.stage >= 4
                    ? "记录与验证"
                    : inv.stage >= 2
                      ? "优化方向排查"
                      : "步骤定位"}
                </Badge>
                <small>{localTime(inv.updatedAt, true)}</small>
              </p>
              <code>{inv.traceId}</code>
              <Button
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  onResume(inv.id);
                }}
              >
                继续这次分析
                <ArrowRight size={14} />
              </Button>
            </article>
          ))
        ) : (
          <p>还没有保存的分析。选择Trace后开始定位即可保留草稿。</p>
        )}
      </PracticeDrawer>
    </>
  );
}
