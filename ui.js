const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const Card = (num, sel, click, dis, small) => {
    const h=calculateHeads(num);
    const col=getCardColor(num);
    const sz=small?'w-12 h-16 text-xs':'w-16 h-24 text-sm';
    return `<button ${click?'onclick="handleCard('+num+')"' :''} ${dis?'disabled':''}
        class="${sz} ${col} text-white rounded-lg shadow-md flex flex-col items-center justify-between p-1
        ${sel?'ring-4 ring-blue-600 scale-105':''} ${!dis&&!sel?'hover:scale-105 cursor-pointer':''} ${dis?'opacity-50':''} font-bold">
        <span class="text-xl">${num}</span><div>${'🐮'.repeat(h)}</div></button>`;
};

window.handleCard = (c) => {
    if(!canPlayTurn()) return;
    if(state.selectedCard===c) playCard(c);
    else{ state.selectedCard=c; render(); }
};
