function switchView(viewId) {
  ['chat', 'career', 'resume'].forEach(v => {
    document.getElementById(`view-${v}`).classList.add("hidden");
  });
  document.getElementById(`view-${viewId}`).classList.remove("hidden");
}