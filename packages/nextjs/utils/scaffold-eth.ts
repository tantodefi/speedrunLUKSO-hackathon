import { toast } from "react-hot-toast";

export type NotificationContent = {
  message: string;
  type: "success" | "error" | "info" | "warning";
};

export const notification = {
  success: (message: string) => {
    toast.success(message, {
      position: "bottom-right",
      duration: 4000,
      className: "font-medium",
    });
  },
  error: (message: string) => {
    toast.error(message, {
      position: "bottom-right",
      duration: 4000,
      className: "font-medium",
    });
  },
  info: (message: string) => {
    toast(message, {
      position: "bottom-right",
      duration: 4000,
      className: "font-medium",
    });
  },
  warning: (message: string) => {
    toast(message, {
      position: "bottom-right",
      duration: 4000,
      className: "font-medium",
      icon: "⚠️",
    });
  },
};
