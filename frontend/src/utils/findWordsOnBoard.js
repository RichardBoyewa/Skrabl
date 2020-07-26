
export const findWordsOnBoard = (boardState, placedTiles) => {
    let wordStart = '',
        wordScore = 0,
        wordMultipliers = [], 
        newWord = false,
        words = [],
        letters = [], 
        dirs = ['across', 'down'];

    const checkSquare = (dir, x, y) => {
        let [row, col] = dir === 'across' ? [x, y] : [y, x];
        var currentSquare = boardState[col + (row * 15)];
        const addWord = () => {
            wordMultipliers.forEach(wordMultiplier => {
                wordScore = wordScore * wordMultiplier;
            });
            words.push({word: letters.join(''), start: wordStart, dir: dir, newWord: newWord, wordScore: wordScore});
            newWord = false; 
        }
        if (!currentSquare.tile) {  
            if (wordStart !== '' && letters.length > 1) {                         
                addWord();
            }
            wordStart = ''; 
            letters = [];
            wordScore = 0;
            newWord = false; 
        } else {
            letters.push(currentSquare.tile.letter);
            wordMultipliers.push(currentSquare.wordMultiplier);
            wordScore += currentSquare.tile.points * currentSquare.letterMultiplier;
            if (placedTiles.filter(item => 
                item.id === currentSquare.tile.id
            ).length > 0) {
                newWord = true;
            }
            if (wordStart !== '' && col === 14 ) {                                 
                addWord();           
            } else if (wordStart == '') {
                wordStart = `${row}-${col}`;  
            }
        }
    }
    
    dirs.forEach(dir => {
        for (var x = 0; x < 15; x++) { 
            for (var y = 0; y < 15; y++) { 
                checkSquare(dir, x, y);
            }
        }
    });

    return words;
}

