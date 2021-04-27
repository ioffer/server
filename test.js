function solution(A){
    A= A.sort()
    console.log(A)
    let smallest = 1;
    for(i of A){
        if(i>0 && i==smallest){
            smallest++;
        }
    }
    return smallest
}
let A=[1,2,3]
let smallest = solution(A);
console.log('smallest=', smallest)