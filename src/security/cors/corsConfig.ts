const corsConfig = (config?: string): (string | RegExp)[] | string => {
  if (!config) return '*'

  return config.split(',').map((value) => {
    if (value.endsWith('$')) return new RegExp(value)
    return value
  })
}

export default corsConfig
