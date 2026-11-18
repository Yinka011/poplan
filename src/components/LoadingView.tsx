import { Loader2, XCircleIcon } from "lucide-react";
import { PropsWithChildren } from "react";

interface Props {
  screen?: boolean;
  page?: boolean;
  error?: string;
  loading?: boolean;
  onRetry?: VoidFunction;
  customLoader?: React.ReactNode;
  loadingText?: string;
  className?: string;
}
export default function LoadingView({
  screen,
  page,
  loading,
  children,
  error,
  onRetry,
  customLoader,
  className,
  loadingText,
}: PropsWithChildren<Props>) {
  const containerClassName = [
    className,
    (loading || error) && "w-full flex items-center justify-center",
    screen && "w-screen h-screen",
    page && "min-h-100",
  ]
    .filter(Boolean)
    .join(" ");

  if (!loading && !error) return <div className={containerClassName}>{children}</div>;

  return (
    <div className={containerClassName}>
      {loading && !customLoader && (
        <div className="flex flex-col justify-center items-center">
          <Loader2 className="animate-spin text-[#1B3A2D]" size={30} />

          {loadingText && <p className="text-[16px] mt-4">{loadingText}</p>}
        </div>
      )}
      {loading && customLoader && customLoader}

      {!loading && error && (
        <div className="flex flex-col gap-2.5 items-center">
          <XCircleIcon stroke="#FF3B30" size={50} />
          <p className="text-[20px]">{error}</p>

          {onRetry && (
            <button
              className="px-4 py-2 bg-[#1B3A2D] text-white rounded"
              onClick={onRetry}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
