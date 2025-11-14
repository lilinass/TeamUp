const pass = document.getElementById("password");
const confirm = document.getElementById("password-confirm");

confirm.addEventListener("input", () => {
  if (confirm.value !== pass.value) {
    confirm.style.borderColor = "#ff6b6b";
  } else {
    confirm.style.borderColor = "#2b3346";
  }
});
