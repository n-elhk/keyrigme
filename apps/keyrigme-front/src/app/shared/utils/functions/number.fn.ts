// /**
//  * @param currentTime in millisecond
//  * @param startTime in millisecond
//  * @description Transformation des émissions pour les convertir en pourcentage
//  */
// export const timeToPercent = (currentTime: number, startTime: number) => {
//   console.log('startTime', startTime);
//   console.log('currentTime', currentTime);
//   return ((startTime - currentTime) / startTime) * 100;
// };

/**
 * @param currentTime in millisecond
 * @param startTime in millisecond
 * @description Transformation des émissions pour les convertir en pourcentage
 */
export const timeToPercent = (currentTime: number, startTime: number) => {
  return (currentTime / startTime) * 100;
};

export const msToSecond = (ms: number) => ms / 1000;
