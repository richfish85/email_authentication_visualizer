"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_HELP_ITEM_KEY,
  HELP_ITEMS,
  type HelpItemKey,
} from "@/lib/help-content";

type HelpContextValue = {
  activeKey: HelpItemKey;
  preview: (key: HelpItemKey) => void;
  clearPreview: () => void;
  pin: (key: HelpItemKey) => void;
  isOpen: boolean;
  openPanel: () => void;
  togglePanel: () => void;
};

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpContextProvider({ children }: { children: ReactNode }) {
  const [selectedKey, setSelectedKey] = useState<HelpItemKey>(DEFAULT_HELP_ITEM_KEY);
  const [previewKey, setPreviewKey] = useState<HelpItemKey | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const value = useMemo<HelpContextValue>(
    () => ({
      activeKey: previewKey ?? selectedKey,
      preview: (key) => {
        if (!HELP_ITEMS[key]) {
          return;
        }

        setPreviewKey(key);
      },
      clearPreview: () => {
        setPreviewKey(null);
      },
      pin: (key) => {
        if (!HELP_ITEMS[key]) {
          return;
        }

        setSelectedKey(key);
        setPreviewKey(null);
        setIsOpen(true);
      },
      isOpen,
      openPanel: () => {
        setIsOpen(true);
      },
      togglePanel: () => {
        setIsOpen((current) => !current);
      },
    }),
    [isOpen, previewKey, selectedKey],
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelpContext() {
  const context = useContext(HelpContext);

  if (!context) {
    throw new Error("useHelpContext must be used within HelpContextProvider.");
  }

  return context;
}
