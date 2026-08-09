const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER)
const MIN_SAFE_BIGINT = BigInt(Number.MIN_SAFE_INTEGER)

export function serializeBigInt(value: bigint): number | string {
  if (value >= MIN_SAFE_BIGINT && value <= MAX_SAFE_BIGINT) return Number(value)
  return value.toString()
}

export function installBigIntJsonSerializer(): void {
  BigInt.prototype.toJSON = function () {
    return serializeBigInt(this.valueOf())
  }
}
