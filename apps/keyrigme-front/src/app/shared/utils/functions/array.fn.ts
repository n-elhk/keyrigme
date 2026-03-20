export const shuffle = <T>(array: T[]) => {
  const randomizedArrays = [...array];
  //   set the index to the randomizedArrayss length
  let i = randomizedArrays.length, j, temp;
  //   create a loop that subtracts everytime it iterates through
  while (--i > 0) {
    //  create a random number and store it in a variable
    j = Math.floor(Math.random() * (i + 1));
    // create a temporary position from the item of the random number    
    temp = randomizedArrays[j];
    // swap the temp with the position of the last item in the randomizedArrays    
    randomizedArrays[j] = randomizedArrays[i];
    // swap the last item with the position of the random number 
    randomizedArrays[i] = temp;
  }
  return randomizedArrays;
}
