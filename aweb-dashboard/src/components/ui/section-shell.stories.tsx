import type { Meta, StoryObj } from "@storybook/react";
import { SectionShell } from "./section-shell";
import { StatusChip } from "./status-chip";

const meta: Meta<typeof SectionShell> = {
  title: "Design System/Section Shell",
  component: SectionShell,
  args: {
    title: "Operational Panel",
    subtitle: "Reusable card scaffolding for dashboards and analytics",
    children: (
      <div className="space-y-2 text-sm text-[color:var(--text-muted)]">
        <p>Use this wrapper for a title, subtitle, and optional action.</p>
        <StatusChip tone="emerald">Adaptive surface</StatusChip>
      </div>
    ),
  },
};

export default meta;

type Story = StoryObj<typeof SectionShell>;

export const Default: Story = {};
