(function() {
  const { useState, useEffect } = React;
  const { createRoot } = ReactDOM;

  function AdminPanel() {
    return React.createElement("div", {className:"p-6 text-green-800 font-bold text-2xl"},
      "Hola Admin 👋"
    );
  }

  const root = createRoot(document.getElementById("root"));
  root.render(React.createElement(AdminPanel));
})();
