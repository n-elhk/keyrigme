import { interval, map, take } from 'rxjs';


/**
 * @param duration in ms
 * @param intervalTime in ms
 */
export const countdown = (duration: number, intervalTime = 200) => {
  // Nombre de valeurs à émettre
  const numberOfValues = duration / intervalTime;
  return interval(intervalTime).pipe(
    map(value => value * intervalTime),
    take(numberOfValues + 1),
  );
};

