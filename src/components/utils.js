export function CreateCollectionClone(collection) {
  return collection.map(item => Object.assign({}, item))
}
