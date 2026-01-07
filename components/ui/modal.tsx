import * as React from "react";
import { XIcon } from "./icons";
import { cn } from "@/lib/utils";
import { getUIText } from "@/lib/constants/ui-text";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  "aria-label"?: string;
  className?: string;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-full",
};

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      size = "md",
      footer,
      showCloseButton = true,
      "aria-label": ariaLabel,
      className,
      ...props
    },
    ref,
  ) => {
    const modalRef = React.useRef<HTMLDivElement>(null);
    const closeButtonRef = React.useRef<HTMLButtonElement>(null);
    const previousActiveElement = React.useRef<HTMLElement | null>(null);

    React.useEffect(() => {
      if (isOpen) {
        previousActiveElement.current = document.activeElement as HTMLElement;
        setTimeout(() => {
          closeButtonRef.current?.focus();
        }, 0);
      } else {
        previousActiveElement.current?.focus();
      }
    }, [isOpen]);

    const trapFocus = React.useCallback(
      (event: KeyboardEvent) => {
        if (!modalRef.current) return;

        const focusableElements =
          modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.key === "Tab") {
          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              event.preventDefault();
              lastElement?.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              event.preventDefault();
              firstElement?.focus();
            }
          }
        } else if (event.key === "Escape") {
          onClose();
        }
      },
      [onClose],
    );

    React.useEffect(() => {
      if (isOpen) {
        document.addEventListener("keydown", trapFocus);
        document.body.style.overflow = "hidden";
        return () => {
          document.removeEventListener("keydown", trapFocus);
          document.body.style.overflow = "";
        };
      }
    }, [isOpen, trapFocus]);

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        ref={ref}
        {...props}
      >
        <div
          ref={modalRef}
          className={cn(
            "relative w-full bg-white rounded-lg shadow-xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto",
            sizeClasses[size],
            className,
          )}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {showCloseButton && (
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                aria-label={getUIText("common", "close")}
              >
                <XIcon />
              </button>
            )}
          </div>

          <div className="p-6">{children}</div>

          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t rounded-b-lg">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  },
);

Modal.displayName = "Modal";

export { Modal };
