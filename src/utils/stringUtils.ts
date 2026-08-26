export const formatName = (name: string): string => {
  if (!name) return "";
  return name.split(" ").map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(" ");
};
