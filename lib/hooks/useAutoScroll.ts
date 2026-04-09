export function scrollIntoViewOnFocus(e: React.FocusEvent<HTMLElement>) {
  setTimeout(() => {
    e.target.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 100);
}
