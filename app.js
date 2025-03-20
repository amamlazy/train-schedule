document.addEventListener('DOMContentLoaded', () => {
  // 要素の取得
  const stationSelect = document.getElementById('station-select');
  const directionSelect = document.getElementById('direction-select');
  const trainList = document.getElementById('train-list');
  const currentTimeElement = document.getElementById('current-time');
  const refreshBtn = document.getElementById('refresh-btn');
  const favoriteBtn = document.getElementById('favorite-btn');
  const favoritesList = document.getElementById('favorites-list');
  
  // お気に入りデータを取得
  let favorites = JSON.parse(localStorage.getItem('trainFavorites')) || [];
  
  // 初期化関数
  function initialize() {
    // 駅リストを動的に生成
    for (const station in scheduleData) {
      const option = document.createElement('option');
      option.value = station;
      option.textContent = station;
      stationSelect.appendChild(option);
    }
    
    // イベントリスナーの設定
    stationSelect.addEventListener('change', onStationChange);
    directionSelect.addEventListener('change', onDirectionChange);
    refreshBtn.addEventListener('click', updateTrainList);
    favoriteBtn.addEventListener('click', addFavorite);
    
    // 現在時刻の初期表示
    updateCurrentTime();
    
    // お気に入りの表示
    renderFavorites();
    
    // 1分ごとに更新
    setInterval(() => {
      updateCurrentTime();
      if (stationSelect.value && directionSelect.value) {
        updateTrainList();
      }
    }, 60000);
  }
  
  // 現在時刻を更新する関数
  function updateCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    currentTimeElement.textContent = `${hours}:${minutes}`;
    return now;
  }
  
  // 駅選択時の処理
  function onStationChange() {
    directionSelect.innerHTML = '<option value="">方面を選択</option>';
    trainList.innerHTML = '<p class="no-selection">方面を選択してください</p>';
    favoriteBtn.disabled = true;
    
    if (stationSelect.value) {
      directionSelect.disabled = false;
      
      // 選択された駅の方面リストを生成
      const directions = Object.keys(scheduleData[stationSelect.value]);
      directions.forEach(direction => {
        const option = document.createElement('option');
        option.value = direction;
        option.textContent = direction;
        directionSelect.appendChild(option);
      });
    } else {
      directionSelect.disabled = true;
    }
  }
  
  // 方面選択時の処理
  function onDirectionChange() {
    if (directionSelect.value) {
      updateTrainList();
      favoriteBtn.disabled = false;
    } else {
      trainList.innerHTML = '<p class="no-selection">方面を選択してください</p>';
      favoriteBtn.disabled = true;
    }
  }
  
  // 電車リストを更新する関数
  function updateTrainList() {
    trainList.innerHTML = '';
    
    const station = stationSelect.value;
    const direction = directionSelect.value;
    
    if (!station || !direction) {
      trainList.innerHTML = '<p class="no-selection">駅と方面を選択してください</p>';
      return;
    }
    
    const now = updateCurrentTime();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // 平日か休日かを判断
    const dayType = [0, 6].includes(now.getDay()) ? 'weekend' : 'weekday';
    
    // 該当する時刻表データを取得
    const scheduleForDirection = scheduleData[station][direction];
    const scheduleData = scheduleForDirection.find(s => s.type === dayType);
    
    if (!scheduleData) {
      trainList.innerHTML = '<p class="no-selection">この時間帯の運行データがありません</p>';
      return;
    }
    
    const { times, types } = scheduleData;
    
    // 現在時刻以降の発車時刻を抽出（最大5件）
    const upcomingTrains = times
      .map((time, index) => ({ time, type: types[index], index }))
      .filter(item => item.time >= currentMinutes)
      .slice(0, 5);
    
    if (upcomingTrains.length === 0) {
      trainList.innerHTML = '<p class="no-selection">本日の運行は終了しました</p>';
      return;
    }
    
    // 電車リストを生成
    upcomingTrains.forEach((train, index) => {
      const hours = Math.floor(train.time / 60).toString().padStart(2, '0');
      const minutes = (train.time % 60).toString().padStart(2, '0');
      const remainingMinutes = train.time - currentMinutes;
      
      const trainItem = document.createElement('div');
      trainItem.className = 'train-item';
      
      // 最初の要素（次の電車）は強調表示
      if (index === 0) {
        trainItem.classList.add('next');
      }
      
      trainItem.innerHTML = `
        <div>
          <div class="departure-time">${hours}:${minutes}</div>
          <div class="train-type">${train.type || '各停'}</div>
        </div>
        <div class="remaining-time">${remainingMinutes}分後</div>
      `;
      
      trainList.appendChild(trainItem);
    });
  }
  
  // お気に入りを追加する関数
  function addFavorite() {
    const station = stationSelect.value;
    const direction = directionSelect.value;
    
    if (!station || !direction) return;
    
    // 重複チェック
    const isDuplicate = favorites.some(
      fav => fav.station === station && fav.direction === direction
    );
    
    if (isDuplicate) {
      alert('すでにお気に入りに登録されています');
      return;
    }
    
    // お気に入りに追加
    favorites.push({ station, direction });
    
    // ローカルストレージに保存
    localStorage.setItem('trainFavorites', JSON.stringify(favorites));
    
    // お気に入りリストを更新
    renderFavorites();
  }
  
  // お気に入りリストを表示する関数
  function renderFavorites() {
    favoritesList.innerHTML = '';
    
    if (favorites.length === 0) {
      favoritesList.innerHTML = '<p class="no-selection">登録されたお気に入りはありません</p>';
      return;
    }
    
    favorites.forEach((favorite, index) => {
      const favoriteItem = document.createElement('div');
      favoriteItem.className = 'favorite-item';
      favoriteItem.innerHTML = `
        <div class="favorite-info">
          <div class="favorite-station-direction">${favorite.station} - ${favorite.direction}</div>
        </div>
        <button class="remove-favorite" data-index="${index}">削除</button>
      `;
      
      // クリックイベント - この設定でお気に入りを選択
      favoriteItem.addEventListener('click', (e) => {
        // 削除ボタンのクリックなら伝播を止める
        if (e.target.className === 'remove-favorite') return;
        
        selectFavorite(favorite);
      });
      
      favoritesList.appendChild(favoriteItem);
    });
    
    // 削除ボタンのイベントリスナー
    document.querySelectorAll('.remove-favorite').forEach(button => {
      button.addEventListener('click', removeFavorite);
    });
  }
  
  // お気に入りを選択する関数
  function selectFavorite(favorite) {
    // 駅を選択
    stationSelect.value = favorite.station;
    onStationChange();
    
    // 方面を選択 (駅選択のonChangeが終わるのを待つ)
    setTimeout(() => {
      directionSelect.value = favorite.direction;
      onDirectionChange();
    }, 10);
  }
  
  // お気に入りを削除する関数
  function removeFavorite(e) {
    const index = parseInt(e.target.getAttribute('data-index'));
    
    // お気に入りから削除
    favorites.splice(index, 1);
    
    // ローカルストレージに保存
    localStorage.setItem('trainFavorites', JSON.stringify(favorites));
    
    // お気に入りリストを更新
    renderFavorites();
  }
  
  // アプリケーションの初期化
  initialize();
});
