const { promisify } = require('util');

const wait = function (func, context = { }, ...args) {
  if (func && typeof (func.then) === 'function') {
    return func.apply(context, args)
    .then(result => [ null, result ])
    .catch(err => [err])
  } else if (typeof func === 'function') {
    func = promisify(func);
    return func.apply(context, args)
    .then(data => [null, data])
    .catch(err => [err])
  } else {
    return ['Only function and promise object is allowed to apply on wait']
  }
}

module.exports = {
   wait
};

