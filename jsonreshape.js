const _ = require('lodash')
const JMeta = require('jmeta')

// Regular expression powered REshaping engine for JSON to JSON transforms
class JSONREshape {
  // Takes in a map object that has regex objects as it's keys and an async(optional) function as its value
  // If the given regex matches a path in the provided object then it invokes the callback with the matching path
  // It looks at the return value of the cb to reconfigure data at the existing path to the new provided one
  static async reshapeAsync ({ sourceObj = {}, map = new Map(), options = { useClone: true, unsetOriginal: true, strict: true } } = {}) {
    const paths = new JMeta(sourceObj).paths()
    let obj = options.useClones ? _.cloneDeep(sourceObj) : sourceObj

    for (let entry of map.entries()) {
      let pathFound = false
      let [pattern, callback] = entry
      for (let path of paths) {
        if (path.match(pattern)) {
          let dataAtPath = _.get(obj, path)
          let transform = await callback(path, dataAtPath)
          // If no transform comes back then just skip
          if (!transform) continue
          let { path: newPath, data: newData, onSet } = transform
          if (!newPath || !_.isString(newPath)) {
            throw new Error(`"path" must be a string specified on the callback return object! provided: ${newPath}`)
          }
          if (path) {
            if (options.unsetOriginal) _.unset(obj, path)

            // If they returned modified data of some kind then set that instead
            if (newData === undefined) newData = dataAtPath
            // If onSet is available then utilize the return from it to set the data at the given path
            if (onSet) {
              if (typeof onSet !== 'function') throw new Error(`"onSet" must be a function! Ex: { path: 'foo.count', onSet: existingCount => ++existingCount`)
              newData = await onSet(_.get(obj, newPath))
            }

            // Set the data at the new given path
            _.set(obj, newPath, newData)
            pathFound = true
          }
        }
      }
      if (!pathFound && options.strict === true) throw new Error(`pattern ${pattern.toString()} did not match any path in the provided object`)
    }

    return obj
  }

  static reshape ({ sourceObj = {}, map = new Map(), options = { useClone: true, unsetOriginal: true } } = {}) {
    const paths = new JMeta(sourceObj).paths()
    let obj = options.useClones ? _.cloneDeep(sourceObj) : sourceObj

    for (let entry of map.entries()) {
      let pathFound = false
      let [pattern, callback] = entry
      for (let path of paths) {
        if (path.match(pattern)) {
          let dataAtPath = _.get(obj, path)
          let { path: newPath, data: newData, onSet } = callback(path, dataAtPath)
          if (!newPath || !_.isString(newPath)) {
            throw new Error(`"path" must be a string specified on the callback return object! provided: ${newPath}`)
          }
          if (path) {
            if (options.unsetOriginal) _.unset(obj, path)

            // If they returned modified data of some kind then set that instead
            if (newData === undefined) newData = dataAtPath
            // If onSet is available then utilize the return from it to set the data at the given path
            if (onSet) {
              if (typeof onSet !== 'function') throw new Error(`"onSet" must be a function! Ex: { path: 'foo.count', onSet: existingCount => ++existingCount`)
              newData = onSet(_.get(obj, newPath))
            }

            // Set the data at the new given path
            _.set(obj, newPath, newData)
            pathFound = true
          }
        }
      }
      if (!pathFound) throw new Error(`pattern ${pattern.toString()} did not match any path in the provided object`)
    }

    return obj
  }
}

module.exports = JSONREshape
