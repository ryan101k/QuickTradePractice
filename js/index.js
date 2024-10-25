let capital = 1000000; // 기본 자본금 100만원
let selectedStockIndex = 0; // 선택된 주식의 인덱스
let ownedStocks = {}; // 보유 주식 정보 저장 { stockName: { quantity, history } }

const stockData = [
  { name: '삼전자', price: 50000, history: [{ price: 50000 }] },
  { name: '컴퓨터화학', price: 10000, history: [{ price: 10000 }] },
  { name: '그린카카오', price: 15000, history: [{ price: 15000 }] },
  { name: '초록상자', price: 1000, history: [{ price: 1000 }] }
];

const stockListElement = document.getElementById('stock-list');
const ownedStocksListElement = document.getElementById('owned-stocks-list');
const capitalElement = document.getElementById('capital');
const quantityInput = document.getElementById('quantity');
const buyButton = document.getElementById('buy-button');
const sellButton = document.getElementById('sell-button');
const saveButton = document.getElementById('save-button');
const ctx = document.getElementById('stock-chart').getContext('2d');
const costInfoElement = document.getElementById('cost-info'); // 비용 정보를 표시할 요소

// 매수량 입력값이 변경될 때마다 비용 정보 업데이트
quantityInput.addEventListener('input', updateCostInfo);

//예측매도 매수량
function updateCostInfo() {
    const quantity = parseInt(quantityInput.value); // 입력된 매수량
    const stock = stockData[selectedStockIndex]; // 선택된 주식
    const cost = stock.price * quantity; // 매수 또는 매도 비용 계산
    costInfoElement.textContent = `비용: ${cost} 원`; // 비용 표시 업데이트
}


// 차트 설정
let stockChart = new Chart(ctx, {
  type: 'line', // 라인 차트 사용
  data: {
    labels: Array(stockData[selectedStockIndex].history.length).fill(''), // X축 레이블 설정
    datasets: [ {
        label: stockData[selectedStockIndex].name, // 주식 이름
        data: stockData[selectedStockIndex].history.map(entry => entry.price),
        borderColor: 'rgb(75, 192, 192)',
        fill: false, // 차트가 선으로만 표현되도록 설정
        tension: 0.1
      }
    ]
  },
  options: {
    scales: {
      y: {
        beginAtZero: true // Y축이 0부터 시작하도록 설정
      }
    }
  }
});

// URL에서 자본금과 보유 주식 상태 불러오기
function loadStateFromURL() {
const urlParams = new URLSearchParams(window.location.search);

// URL에서 자본금 불러오기
if (urlParams.has('capital')) {
  capital = parseFloat(urlParams.get('capital'));
  capitalElement.textContent = capital;
}

// URL에서 보유 주식 상태 불러오기
if (urlParams.has('stocks')) {
  try {
    const stocksArray = JSON.parse(urlParams.get('stocks')); // 배열로 저장된 주식 정보
    ownedStocks = {}; // 빈 객체로 초기화

    // 배열 데이터를 객체로 변환하여 ownedStocks에 저장
    stocksArray.forEach(stock => {
      ownedStocks[stock.name] = {
        quantity: stock.quantity,
        buyPrice: stock.buyPrice
      };
    });

    updateOwnedStocks(); // 보유 주식 목록 업데이트
  } catch (error) {
    console.error('Error parsing stocks from URL:', error);
  }
}
}

// 주식 목록 업데이트 함수
function updateStockList() {
  stockListElement.innerHTML = ''; // 기존 주식 목록 초기화
  stockData.forEach((stock, index) => {
    let oldPrice =0;
    //2번째 부터 이익손실 계산
    if(stock.history.length >1){
      oldPrice = stock.history[stock.history.length - 2].price;
    }
     // 이익이면 파란색, 손실이면 빨간색
    const profitOrLoss = stock.price- oldPrice;
    const profitOrLossClass = profitOrLoss >= 0 ? 'profit' : 'loss';

    const li = document.createElement('li');
    li.innerHTML =  `${stock.name}:  <span class="${profitOrLossClass}"> ${stock.price} 원 </span> [ ${profitOrLoss}원증가 ] `; // 주식 이름과 가격 표시
    li.addEventListener('click', () => {
      selectedStockIndex = index;
      updateChart(); // 선택된 주식의 차트 업데이트
    });
    stockListElement.appendChild(li);
  });
}

// 보유한 주식 목록 업데이트 함수
function updateOwnedStocks() {
  ownedStocksListElement.innerHTML = ''; // 기존 보유 주식 목록 초기화
  Object.keys(ownedStocks).forEach(stockName => {
    const stock = stockData.find(s => s.name === stockName);
    if (stock) {
      const owned = ownedStocks[stockName];
      const currentPrice = stock.price;
      const totalCost = owned.quantity * owned.buyPrice;
      const currentValue = owned.quantity * currentPrice;
      const profitOrLoss = currentValue - totalCost; // 이익/손실 계산
      const profitOrLossClass = profitOrLoss >= 0 ? 'profit' : 'loss'; // 이익이면 파란색, 손실이면 빨간색

      const li = document.createElement('li');
      li.innerHTML = `${stockName}: ${owned.quantity}주, 
                      현재가: ${currentPrice} 원 
                      <span class="${profitOrLossClass}">
                        (${profitOrLoss >= 0 ? '+' : ''}${profitOrLoss} 원)
                      </span>`;
      ownedStocksListElement.appendChild(li);
    }
  });
}

// 차트 업데이트 함수
function updateChart() {
const stock = stockData[selectedStockIndex];
let today = new Date();

// 차트의 데이터셋 업데이트 (가격)
stockChart.data.datasets[0].label = stock.name;
stockChart.data.datasets[0].data = stock.history.map(entry => entry.price);

// 차트 라벨 업데이트 (현재 시간 추가)
const newLabel = today.toLocaleTimeString('en-GB', { 
hour: '2-digit', 
minute: '2-digit', 
second: '2-digit' 
});

// 기록이 10개를 넘으면 오래된 기록과 라벨 삭제
if (stockChart.data.labels.length >= 10) {
stockChart.data.labels.shift(); // 오래된 라벨 삭제
}

stockChart.data.labels.push(newLabel); // 새 라벨 추가
stockChart.update(); // 차트 업데이트
}

// 주식 가격 업데이트 함수
function updatePrices() {
stockData.forEach(stock => {
const maxChange = stock.price * 0.3;
const change = (Math.random() * (2 * maxChange)) - maxChange;
stock.price = Math.max(0, stock.price + parseInt(change));

// 가격 기록(history)에 새로운 가격 추가
stock.history.push({ price: stock.price });

// 기록이 10개를 넘으면 오래된 기록 삭제
if (stock.history.length > 10) {
  stock.history.shift(); // 오래된 기록 삭제
}
});

updateStockList(); // 주식 목록 업데이트
updateOwnedStocks(); // 보유 주식 목록 업데이트
updateChart(); // 차트 업데이트
}



// 매수 함수
function buyStock() {
  const quantity = parseInt(quantityInput.value); // 매수량 가져오기
  const stock = stockData[selectedStockIndex];
  const cost = stock.price * quantity; // 총 매수 비용 계산
  if (capital >= cost) {
    capital -= cost; // 자본금에서 매수 비용 차감
    capitalElement.textContent = capital;
    if (ownedStocks[stock.name]) {
      const totalQuantity = ownedStocks[stock.name].quantity + quantity;
      ownedStocks[stock.name].buyPrice = 
        ((ownedStocks[stock.name].buyPrice * ownedStocks[stock.name].quantity) + cost) / totalQuantity; // 평균 매입가 재계산
      ownedStocks[stock.name].quantity = totalQuantity;
    } else {
      ownedStocks[stock.name] = { quantity, buyPrice: stock.price }; // 새로운 주식 추가
    }
    alert(`${stock.name} 주식을 ${quantity}주 매수했습니다. 현재 가격: ${stock.price} 원`);
    updateOwnedStocks();
  } else {
    alert('자본금이 부족합니다.');
  }
}

// 매도 함수
function sellStock() {
  const quantity = parseInt(quantityInput.value); // 매도할 주식 수량
  const stock = stockData[selectedStockIndex];
  if (ownedStocks[stock.name] && ownedStocks[stock.name].quantity >= quantity) {
    const profit = stock.price * quantity; // 매도 후 이익 계산
    capital += profit; // 자본금에 매도 이익 추가
    ownedStocks[stock.name].quantity -= quantity; // 보유 주식 수량 감소
    if (ownedStocks[stock.name].quantity === 0) {
      delete ownedStocks[stock.name]; // 주식 수량이 0이 되면 삭제
    }
    capitalElement.textContent = capital.toFixed(2);
    alert(`${stock.name} 주식을 ${quantity}주 매도했습니다. 현재 가격: ${stock.price} 원`);
    updateOwnedStocks();
  } else {
    alert('보유한 주식이 부족합니다.');
  }
}

  // 상태 저장 함수
function saveState() {
  // 보유 주식 정보가 제대로 저장되어 있는지 확인
  const stocksOwned = Object.keys(ownedStocks).map(stockName => {
    const stock = ownedStocks[stockName];
    return {
      name: stockName,
      quantity: stock.quantity,
      buyPrice: stock.buyPrice
    };
  });

  // 자본금 및 보유 주식 상태 저장을 위해 URL 파라미터로 변환
  const queryParams = new URLSearchParams({
    capital: capital, // 자본금
    stocks: JSON.stringify(stocksOwned) // 보유 주식 데이터
  });

  // 페이지를 새로고침하지 않고 URL을 업데이트
  history.replaceState(null, '', '?' + queryParams.toString());
}
//매수 버튼 클릭시 실행
buyButton.addEventListener('click', buyStock);
//매도 버튼 클릭시 실행
sellButton.addEventListener('click', sellStock);
//저장버튼 클릭시 실행
saveButton.addEventListener('click', saveState);

function main() {
  loadStateFromURL(); // 페이지 시작 시 URL에서 자본금과 주식 상태 불러오기
  updateStockList();    //주식 목록 상태 변환
  updateOwnedStocks(); // 불러온 주식 상태를 화면에 표시
  setInterval(updatePrices, 5000); // 5초마다 주식 가격 변동
}
//시작시 프로그램 실행
main();