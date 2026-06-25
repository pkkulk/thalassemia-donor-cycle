import type { Meta, StoryObj } from "@storybook/react";
import { StatusChip } from "./status-chip";

const meta: Meta<typeof StatusChip> = {
  title: "Design System/Status Chip",
  component: StatusChip,
  args: {
    tone: "rose",
    children: "Live snapshot",
  },
};

export default meta;

type Story = StoryObj<typeof StatusChip>;

export const Default: Story = {};

export const Tokens: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusChip tone="rose">Rose</StatusChip>
      <StatusChip tone="blue">Blue</StatusChip>
      <StatusChip tone="emerald">Emerald</StatusChip>
      <StatusChip tone="amber">Amber</StatusChip>
      <StatusChip tone="violet">Violet</StatusChip>
      <StatusChip tone="slate">Slate</StatusChip>
    </div>
  ),
};
