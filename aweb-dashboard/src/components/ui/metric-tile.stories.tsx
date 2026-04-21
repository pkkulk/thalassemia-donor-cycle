import type { Meta, StoryObj } from "@storybook/react";
import { FaUsers } from "react-icons/fa";
import { MetricTile } from "./metric-tile";

const meta: Meta<typeof MetricTile> = {
  title: "Design System/Metric Tile",
  component: MetricTile,
  args: {
    label: "Active Donors",
    value: 247,
    footer: "Live right now",
    icon: <FaUsers />,
  },
};

export default meta;

type Story = StoryObj<typeof MetricTile>;

export const Default: Story = {};
