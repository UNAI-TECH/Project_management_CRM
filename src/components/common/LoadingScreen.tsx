import React from 'react';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message,
  subMessage,
  fullScreen = true,
}) => {
  return (
    <div
      className={`${
        fullScreen ? 'fixed inset-0 z-[9999] w-screen h-screen' : 'w-full py-16'
      } bg-white flex flex-col items-center justify-center select-none animate-fade-in`}
    >
      <div className="flex flex-col items-center justify-center space-y-4 px-4">
        {/* Transparent Loader GIF on Pure White Background */}
        <div className="relative flex items-center justify-center">
          <img
            src="./loader.gif"
            alt="Loading..."
            className="w-36 sm:w-44 h-auto object-contain drop-shadow-sm"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.endsWith('/loader.gif') || target.src.endsWith('./loader.gif')) {
                target.src = './assets/loader.gif';
              }
            }}
          />
        </div>

        {/* Optional Status / Caption */}
        {message && (
          <div className="text-center space-y-1 pt-2 animate-fade-in">
            <p className="text-xs font-bold tracking-tight text-slate-800 font-display">
              {message}
            </p>
            {subMessage && (
              <p className="text-[11px] text-slate-400 font-medium">
                {subMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
