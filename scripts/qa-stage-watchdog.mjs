export const createStageWatchdog = ({ timeoutMs, onTimeout }) => {
  let timer = null;

  const clear = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const mark = (stage) => {
    clear();
    timer = setTimeout(() => {
      timer = null;
      onTimeout({ stage, timeoutMs });
    }, timeoutMs);
  };

  return { mark, clear };
};
