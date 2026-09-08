// Tell the embedding page how much room the widget needs.
useEffect(() => {
  if (window.parent === window) return;           // not embedded, nothing to do
  window.parent.postMessage(
    { type: 'racfit-widget', state: isOpen ? 'open' : 'closed' },
    'https://www.goracfit.com'                    // repeat for the apex if both are live
  );
}, [isOpen]);
