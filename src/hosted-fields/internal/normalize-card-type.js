import removeIgnorableCharacters from "./remove-ignorable-characters";

export default function normalizeCardType(type) {
  return removeIgnorableCharacters(type).toLowerCase();
}
