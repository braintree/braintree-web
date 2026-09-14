export default function removeIgnorableCharacters(str) {
  if (str) {
    return str.replace(/[-\s]/g, "");
  }

  return "";
}
