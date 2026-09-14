export default function findRootNode(element) {
  while (element.parentNode) {
    element = element.parentNode;
  }

  return element;
}
