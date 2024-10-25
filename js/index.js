let capital = 10000000; // 기본 자본금 1000만원
let selectedStockIndex = 0; // 선택된 주식의 인덱스
let ownedStocks = {}; // 보유 주식 정보 저장 { stockName: { quantity, history } }

// 주식 목록
const stockData = [
  { name: '삼전', price: 50000, history: [{ price: 50000 }] },
  { name: '김디비아', price: 10000, history: [{ price: 10000 }] },
  { name: '럭키금성', price: 15000, history: [{ price: 15000 }] },
  { name: '김명숙수학학원', price: 100, history: [{ price: 100 }] },
  { name: '황금전자', price: 15000, history: [{ price: 15000 }] },
  { name: '초록박스어린이재단', price: 4000, history: [{ price: 4000 }] }
];

const stockListElement = document.getElementById('stock-list');
const ownedStocksListElement = document.getElementById('owned-stocks-list');
const capitalElement = document.getElementById('capital');
const quantityInput = document.getElementById('quantity'); // 매수 인풋값
const quantityInput_sell = document.getElementById('quantity2'); // 매도 인풋값
const buyButton = document.getElementById('buy-button');
const sellButton = document.getElementById('sell-button');
const saveButton = document.getElementById('save-button');
const ctx = document.getElementById('stock-chart').getContext('2d');
const costInfoElement = document.getElementById('cost-info'); // 매수 비용 정보를 표시할 요소

// 매수량 입력값이 변경될 때마다 비용 정보 업데이트
quantityInput.addEventListener('input', updateCostInfo);
// 매도량 입력값이 변경될 때마다 수익 정보 업데이트
quantityInput_sell.addEventListener('input', updateSellCostInfo);

// 예측 매도 수익 계산
function updateSellCostInfo() {
  const quantity = parseInt(quantityInput_sell.value); // 입력된 매도량
  const stock = stockData[selectedStockIndex]; // 선택된 주식
  const sellProfit = stock.price * quantity; // 매도 수익 계산
  const costInfoSellElement = document.getElementById('cost-info-sell'); // 매도 수익 정보를 표시할 요소
  costInfoSellElement.textContent = `수익: ${sellProfit} 원`; // 수익 표시 업데이트
}

// 매수 비용 계산 및 업데이트
function updateCostInfo() {
  const quantity = parseInt(quantityInput.value); // 입력된 매수량
  const stock = stockData[selectedStockIndex]; // 선택된 주식
  const cost = stock.price * quantity; // 매수 비용 계산
  costInfoElement.textContent = `비용: ${cost} 원`; // 비용 표시 업데이트
}

// 차트 초기 설정
let stockChart = new Chart(ctx, {
  type: 'line', // 라인 차트 사용
  data: {
    labels: stockData[selectedStockIndex].history.map((_, i) => `시간 대`), // 초기값 설정
    datasets: [{
      label: stockData[selectedStockIndex].name, // 선택된 주식 이름
      data: stockData[selectedStockIndex].history.map(entry => entry.price),
      borderColor: 'rgb(75, 192, 192)',
      fill: false,
      tension: 0.1
    }]
  },
  options: {
    scales: {
      y: {
        beginAtZero: true // Y축이 0부터 시작하도록 설정
      }
    }
  }
});

// 페이지가 로드될 때 선택된 주식의 초기 차트 렌더링
function initializeChart() {
  const stock = stockData[selectedStockIndex];
  
  // 초기 레이블과 데이터셋 설정

  stockChart.data.datasets[0].label = stock.name;
  stockChart.data.datasets[0].data = stock.history.map(entry => entry.price);

  stockChart.update();
}



// 개별 주식 차트 업데이트 함수
function updateChart() {
  const stock = stockData[selectedStockIndex];
  
  // 차트 라벨과 데이터셋 업데이트
  stockChart.data.datasets[0].label = stock.name;
  stockChart.data.datasets[0].data = stock.history.map(entry => entry.price);
  
  // 시간 라벨 업데이트 (현재 시간 추가)
  const newLabel = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  if (stockChart.data.labels.length >= 10) {
    stockChart.data.labels.shift(); // 오래된 라벨 삭제
  }
  stockChart.data.labels.push(newLabel); // 새로운 라벨 추가

  stockChart.update(); // 차트 업데이트
}

// 주식 가격 업데이트 함수
function updatePrices() {
  stockData.forEach(stock => {
    const maxChange = stock.price * 0.3;
    const change = (Math.random() * (2 * maxChange)) - maxChange;
    stock.price = Math.max(0, stock.price + parseInt(change));
    stock.history.push({ price: stock.price });
    if (stock.history.length > 10) {
      stock.history.shift();
    }
  });

  updateStockList(); // 주식 목록 업데이트
  updateOwnedStocks(); // 보유 주식 목록 업데이트
  
  // 선택된 주식만 업데이트
  updateChart();
}
// 주식 목록 업데이트 함수
function updateStockList() {
  stockListElement.innerHTML = ''; // 기존 주식 목록 초기화
  stockData.forEach((stock, index) => {
    let oldPrice = 0;
    if (stock.history.length > 1) {
      oldPrice = stock.history[stock.history.length - 2].price; // 이전 가격
    }
    const profitOrLoss = stock.price - oldPrice; // 이익/손실 계산
    const profitOrLossClass = profitOrLoss >= 0 ? 'profit' : 'loss'; // 이익이면 파란색, 손실이면 빨간색

    // 새로운 목록 아이템 생성
    const li = document.createElement('li');
    li.innerHTML = `${stock.name}: <span class="${profitOrLossClass}"> ${stock.price} 원 </span> [ ${profitOrLoss}원 ${profitOrLoss >= 0 ? '증가' : '감소'} ]`;
    
    // 클릭 시 해당 주식의 차트를 업데이트하도록 설정
    li.addEventListener('click', () => {
      selectedStockIndex = index;
      updateChart(); // 선택된 주식의 차트 업데이트
    });
    
    stockListElement.appendChild(li); // 주식 목록에 추가
  });
}

// 보유한 주식 목록 업데이트 함수
function updateOwnedStocks() {
  ownedStocksListElement.innerHTML = ''; // 기존 보유 주식 목록 초기화

  Object.keys(ownedStocks).forEach(stockName => {
    const stock = stockData.find(s => s.name === stockName); // 주식 데이터에서 해당 주식 찾기
    if (stock) {
      const owned = ownedStocks[stockName]; // 보유한 주식 데이터
      const currentPrice = stock.price; // 현재가
      const totalCost = owned.quantity * owned.buyPrice; // 총 매입 비용
      const currentValue = owned.quantity * currentPrice; // 현재 가치
      const profitOrLoss = currentValue - totalCost; // 이익/손실 계산
      const profitOrLossClass = profitOrLoss >= 0 ? 'profit' : 'loss'; // 이익이면 파란색, 손실이면 빨간색

      // 보유 주식 목록에 표시할 내용 생성
      const li = document.createElement('li');
      li.innerHTML = `${stockName}: ${owned.quantity}주, 현재가: ${currentPrice} 원 
                      <span class="${profitOrLossClass}">
                        (${profitOrLoss >= 0 ? '+' : ''}${profitOrLoss} 원)
                      </span>`;
      ownedStocksListElement.appendChild(li); // 보유 주식 목록에 추가
    }
  });
}

// URL에서 자본금과 보유 주식 상태 불러오기
function loadStateFromURL() {
  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.has('capital')) {
    capital = parseFloat(urlParams.get('capital'));
    capitalElement.textContent = capital;
  }

  if (urlParams.has('stocks')) {
    try {
      const stocksArray = JSON.parse(urlParams.get('stocks'));
      ownedStocks = {};
      stocksArray.forEach(stock => {
        ownedStocks[stock.name] = {
          quantity: stock.quantity,
          buyPrice: stock.buyPrice
        };
      });

      updateOwnedStocks();
    } catch (error) {
      console.error('Error parsing stocks from URL:', error);
    }
  }
}

// 매수 함수
function buyStock() {
  const quantity = parseInt(quantityInput.value);
  const stock = stockData[selectedStockIndex];
  const cost = stock.price * quantity;
  if (capital >= cost) {
    capital -= cost;
    capitalElement.textContent = capital;
    if (ownedStocks[stock.name]) {
      const totalQuantity = ownedStocks[stock.name].quantity + quantity;
      ownedStocks[stock.name].buyPrice =
        ((ownedStocks[stock.name].buyPrice * ownedStocks[stock.name].quantity) + cost) / totalQuantity;
      ownedStocks[stock.name].quantity = totalQuantity;
    } else {
      ownedStocks[stock.name] = { quantity, buyPrice: stock.price };
    }
    showTemporaryAlert(`${stock.name} 주식을 ${quantity}주 매수했습니다. 현재 가격: ${stock.price} 원`, 2000);
    updateOwnedStocks();
  } else {
    showTemporaryAlert('자본금이 부족합니다.', 2000);
  }
}

// 매도 함수
function sellStock() {
  const quantity = parseInt(quantityInput_sell.value);
  const stock = stockData[selectedStockIndex];
  if (ownedStocks[stock.name] && ownedStocks[stock.name].quantity >= quantity) {
    const profit = stock.price * quantity;
    capital += profit;
    ownedStocks[stock.name].quantity -= quantity;
    if (ownedStocks[stock.name].quantity === 0) {
      delete ownedStocks[stock.name];
    }
    capitalElement.textContent = capital;
    showTemporaryAlert(`${stock.name} 주식을 ${quantity}주 매도했습니다. 현재 가격: ${stock.price} 원`, 2000);
    updateOwnedStocks();
  } else {
    showTemporaryAlert('보유한 주식이 부족합니다.', 2000);
  }
}

// 상태 저장 함수
function saveState() {
  const stocksOwned = Object.keys(ownedStocks).map(stockName => {
    const stock = ownedStocks[stockName];
    return {
      name: stockName,
      quantity: stock.quantity,
      buyPrice: stock.buyPrice
    };
  });

  const queryParams = new URLSearchParams({
    capital: capital,
    stocks: JSON.stringify(stocksOwned),
    stockHistory: JSON.stringify(stockData.map(stock => ({
      name: stock.name,
      price: stock.price,
      history: stock.history
    })))
  });

  const url = '?' + queryParams.toString();
  history.replaceState(null, '', url);
  copyToClipboard(url);
  showTemporaryAlert('상태가 저장되었습니다!', 2000);
}

// 클립보드에 URL 복사 함수
function copyToClipboard(text) {
  navigator.clipboard.writeText(window.location.href)
    .then(() => console.log('URL copied to clipboard'))
    .catch(err => console.error('Failed to copy URL:', err));
}

// 임시 알림 메시지 표시 함수
function showTemporaryAlert(message, duration) {
  const alertBox = document.createElement('div');
  alertBox.textContent = message;
  alertBox.className = 'alert';
  document.body.appendChild(alertBox);

  setTimeout(() => {
    alertBox.remove();
  }, duration);
}

// 알림 상자 설정
const style = document.createElement('style');
style.innerHTML = `
  .alert {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 15px;
    background-color: #c0c0c0;
    color: black;
    border: 2px solid #000;
    font-family: 'MS Sans Serif', Arial, sans-serif;
    font-size: 14px;
    box-shadow: 3px 3px #404040, -1px -1px #ffffff;
    z-index: 1000;
    width: 300px;
    text-align: center;
  }
`;
document.head.appendChild(style);

// 버튼 클릭 이벤트 설정
buyButton.addEventListener('click', buyStock);
sellButton.addEventListener('click', sellStock);
saveButton.addEventListener('click', saveState);

// 초기 로딩 및 이벤트 설정
function main() {
  loadStateFromURL();
  updateStockList();
  updateOwnedStocks();
  setInterval(updatePrices, 3000); // 3초마다 주식 업데이트
}
//처음 시작시 초기차트 가져오기
window.onload = function() {
  initializeChart();
  main();
};