export const formatRelativeTime = (inputString: Date | string) => {
  const date = new Date(inputString);

  const now = new Date();

  const diffInMs = now.getTime() - date.getTime();

  if (diffInMs < 0) {
    return "in future";
  }

  const diffInSeconds = diffInMs / 1000;
  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = diffInSeconds / 60;
  if (diffInMinutes < 60) {
    const roundedMinutes = Math.floor(diffInMinutes);
    return `${roundedMinutes} minute${roundedMinutes === 1 ? "" : "s"} ago`;
  }

  const diffInHours = diffInMinutes / 60;
  if (diffInHours < 24) {
    const roundedHours = Math.floor(diffInHours);
    return `${roundedHours} hour${roundedHours === 1 ? "" : "s"} ago`;
  }

  const diffInDays = diffInHours / 24;
  if (diffInDays < 7) {
    const roundedDays = Math.floor(diffInDays);
    return `${roundedDays} day${roundedDays === 1 ? "" : "s"} ago`;
  }

  // fallback to full date
  return date.toLocaleString("en-US");
};
