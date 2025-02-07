import { ReactNode } from "react";
import { ToastPosition, toast } from "react-hot-toast";
import { XMarkIcon } from "@heroicons/react/20/solid";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";

export interface NotificationOptions {
  duration?: number;
  icon?: string;
  position?: ToastPosition;
  message?: string;
  description?: ReactNode;
}

const DEFAULT_DURATION = 3000;
const DEFAULT_POSITION: ToastPosition = "top-right";

const ENUM_STATUSES = {
  success: <CheckCircleIcon className="w-6 text-success" />,
  info: <InformationCircleIcon className="w-6 text-info" />,
  loading: (
    <div className="flex justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-info"></div>
    </div>
  ),
  warning: <ExclamationTriangleIcon className="w-6 text-warning" />,
  error: <ExclamationCircleIcon className="w-6 text-error" />,
};

const createToast = (content: React.ReactNode, status: keyof typeof ENUM_STATUSES, options?: NotificationOptions) => {
  return toast.custom(
    t => (
      <div
        className={`flex flex-row items-start justify-between max-w-sm rounded-xl shadow-center shadow-accent bg-base-200 p-4 transform-gpu relative transition-all duration-500 ease-in-out space-x-2
        ${
          (options?.position || DEFAULT_POSITION).substring(0, 3) === "top"
            ? `hover:translate-y-1 ${t.visible ? "top-0" : "-top-96"}`
            : `hover:-translate-y-1 ${t.visible ? "bottom-0" : "-bottom-96"}`
        }`}
      >
        <div className="leading-[0] self-center">{options?.icon ? options.icon : ENUM_STATUSES[status]}</div>
        <div className={`overflow-x-hidden break-words whitespace-pre-line ${options?.icon ? "mt-1" : ""}`}>
          {content}
        </div>
        <div className={`cursor-pointer text-lg ${options?.icon ? "mt-1" : ""}`} onClick={() => toast.dismiss(t.id)}>
          <XMarkIcon className="w-6 cursor-pointer" onClick={() => toast.remove(t.id)} />
        </div>
      </div>
    ),
    {
      duration: status === "loading" ? Infinity : options?.duration || DEFAULT_DURATION,
      position: options?.position || DEFAULT_POSITION,
    },
  );
};

/**
 * Custom notification functions
 */
export const notification = {
  info: (message: string, options?: NotificationOptions) => createToast(message, "info", options),
  success: (message: string, options?: NotificationOptions) => createToast(message, "success", options),
  warning: (message: string, options?: NotificationOptions) => createToast(message, "warning", options),
  error: (message: string, options?: NotificationOptions) => createToast(message, "error", options),
  loading: (message: string, options?: NotificationOptions) => createToast(message, "loading", options),
};
