// @ts-nocheck
import SongbirdFramework from "./songbird";

function CardinalModalFramework(options) {
  SongbirdFramework.call(this, options);
}

CardinalModalFramework.prototype = Object.create(SongbirdFramework.prototype, {
  constructor: SongbirdFramework,
});

export default CardinalModalFramework;
