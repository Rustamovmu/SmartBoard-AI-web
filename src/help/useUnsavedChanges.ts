import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
export function useUnsavedChanges(dirty: boolean) {
  const router = useRouter();
  const unsaved = useRef(dirty);
  unsaved.current = dirty;
  const allowLeave = () =>
    !dirty || window.confirm("Discard unsaved help changes?");
  useEffect(() => {
    const reset = () => {
      unsaved.current = false;
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (unsaved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const beforeNavigation = (event: Event) => {
      if (!unsaved.current) return;
      if (!window.confirm("Discard unsaved help changes?"))
        event.preventDefault();
      else unsaved.current = false;
    };
    const click = (event: MouseEvent) => {
      if (
        !unsaved.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const target = new URL(anchor.href, window.location.href);
      if (
        target.origin === window.location.origin &&
        target.pathname === window.location.pathname &&
        target.search === window.location.search
      )
        return;
      if (!window.confirm("Discard unsaved help changes?")) {
        event.preventDefault();
        event.stopImmediatePropagation();
      } else unsaved.current = false;
    };
    document.addEventListener("click", click, true);
    window.addEventListener("beforeunload", unload);
    window.addEventListener("smartbord:clear-protected", reset);
    window.addEventListener(
      "smartbord:before-admin-navigation",
      beforeNavigation,
    );
    router.beforePopState(() => {
      if (!unsaved.current) return true;
      if (!window.confirm("Discard unsaved help changes?")) return false;
      unsaved.current = false;
      return true;
    });
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("smartbord:clear-protected", reset);
      window.removeEventListener(
        "smartbord:before-admin-navigation",
        beforeNavigation,
      );
      router.beforePopState(() => true);
    };
  }, [router]);
  return {
    allowLeave,
    reset: () => {
      unsaved.current = false;
    },
  };
}
