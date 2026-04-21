import type { Meta, StoryObj } from "@storybook/react";
import { Surface } from "./surface";

const meta: Meta<typeof Surface> = {
  title: "Design System/Surface",
  component: Surface,
  args: {
    className: "p-6",
    children: "Tokenized surface panel",
  },
};

export default meta;

type Story = StoryObj<typeof Surface>;

export const Default: Story = {};
