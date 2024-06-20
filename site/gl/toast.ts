export function toast(message: string) {
  const toaster = document.getElementById("toaster") as HTMLElement;
  if (!toaster) {
    alert(message);
    return;
  }

  const messageDiv = document.createElement("div");
  messageDiv.textContent = message;
  toaster.appendChild(messageDiv);
  toaster.classList.toggle("hidden", false);

  setTimeout(() => {
    toaster.removeChild(messageDiv);
    if (!toaster.children.length) {
      toaster.classList.toggle("hidden", true);
    }
  }, 5000);
}
