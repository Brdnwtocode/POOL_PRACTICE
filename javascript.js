document.addEventListener("DOMContentLoaded", () => {
    // Canvas and Context
    const canvas = document.getElementById("pool-canvas");
    const ctx = canvas.getContext("2d");
    const canvasContainer = document.getElementById("pool-canvas-container");
  
    // Buttons
    const clearAllButton = document.getElementById("clear-all-btn");
    const undoButton = document.getElementById("undo-btn");
    const colorPickerInput = document.getElementById("color-picker");
    const colorPickerBtn = document.getElementById("color-picker-btn");
    const themeToggleBtn = document.getElementById("themeToggle");
    const themeIconLight = document.getElementById("theme-icon-light");
    const themeIconDark = document.getElementById("theme-icon-dark");
    const func1Button = document.getElementById("function1-btn"); // Banking Toggle
    const func2Button = document.getElementById("function2-btn");
    const optionsButton = document.getElementById("options-btn");
  
    // Banking Controls
    const bankingControlsDiv = document.getElementById("banking-controls");
    const decreaseBanksBtn = document.getElementById("decrease-banks");
    const increaseBanksBtn = document.getElementById("increase-banks");
    const maxBanksDisplay = document.getElementById("max-banks-display");
  
    // Control Displays & Buttons
    const control1Up = document.getElementById("control1-up");
    const control1Down = document.getElementById("control1-down");
    const control1Display = document.getElementById("control1-display");
    let control1Value = 0;
  
    // --- State ---
    let isDrawing = false;
    let isBankingMode = false;
    let maxBanks = 1;
    let currentPath = []; // For freehand drawing and lines
    let objects = []; // Stores all drawn objects (lines, balls, circles, freehand paths)
    let bankingStartPoint = null;
    let bankingCurrentEndPoint = null;
    let calculatedBankPath = [];
    let drawingColor = "#ffffff"; // Default drawing color
    let drawingMode = 'free-draw'; // Default mode
  
    // --- Drawing Style Constants ---
    const DRAWING_LINE_WIDTH = 3;
    const BALL_RADIUS = 12;
    const BANKING_INITIAL_LINE_COLOR = "rgba(255, 255, 0, 0.7)"; // Yellow for user line
    const BANKING_PATH_COLOR = "rgba(0, 255, 0, 0.8)"; // Green for predicted path
    const BANKING_LINE_WIDTH = 2;
  
    // --- Table Drawing Constants ---
    const RAIL_COLOR = "#543a29";
    const FELT_COLOR = "#006400";
    const POCKET_COLOR = "#000000";
    const MARKING_COLOR = "rgba(255, 255, 255, 0.4)";
    const RAIL_WIDTH_RATIO = 0.05;
    const POCKET_RADIUS_RATIO = 0.04;
    const SIDE_POCKET_RADIUS_MULTIPLIER = 1.2;
    const EPSILON = 0.01;
  
    // --- Calculated Table Boundaries ---
    let tableBounds = { top: 0, bottom: 0, left: 0, right: 0 };
  
    // --- Functions ---
  
    /** Updates table boundaries based on canvas size. */
    function updateTableBounds() {
      const h = canvas.height;
      const w = canvas.width;
      if (w === 0 || h === 0) return;
      const railWidth = h * RAIL_WIDTH_RATIO;
      tableBounds = {
        top: railWidth,
        bottom: h - railWidth,
        left: railWidth,
        right: w - railWidth,
      };
    }
  
    /** Draws the pool table background. */
    function drawPoolTable() {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;
      const railWidth = h * RAIL_WIDTH_RATIO;
      const basePocketRadius = h * POCKET_RADIUS_RATIO;
      const cornerPocketRadius = basePocketRadius * 1.414;
      const sidePocketRadius = basePocketRadius * SIDE_POCKET_RADIUS_MULTIPLIER;
  
      ctx.fillStyle = RAIL_COLOR;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = FELT_COLOR;
      ctx.fillRect(
        tableBounds.left,
        tableBounds.top,
        tableBounds.right - tableBounds.left,
        tableBounds.bottom - tableBounds.top
      );
  
      ctx.fillStyle = POCKET_COLOR;
      const drawPocket = (x, y, radius) => {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      };
      drawPocket(tableBounds.left, tableBounds.top, cornerPocketRadius);
      drawPocket(tableBounds.right, tableBounds.top, cornerPocketRadius);
      drawPocket(tableBounds.left, tableBounds.bottom, cornerPocketRadius);
      drawPocket(tableBounds.right, tableBounds.bottom, cornerPocketRadius);
      drawPocket(w / 2, tableBounds.top / 2, sidePocketRadius);
      drawPocket(w / 2, h - tableBounds.top / 2, sidePocketRadius);
  
      ctx.strokeStyle = MARKING_COLOR;
      ctx.lineWidth = Math.max(1, h * 0.003);
      const headStringX = w * 0.25;
      ctx.beginPath();
      ctx.moveTo(headStringX, tableBounds.top);
      ctx.lineTo(headStringX, tableBounds.bottom);
      ctx.stroke();
      const footSpotX = w * 0.75;
      const footSpotY = h / 2;
      ctx.beginPath();
      ctx.arc(
        footSpotX,
        footSpotY,
        Math.max(2, basePocketRadius / 4),
        0,
        Math.PI * 2
      );
      ctx.fillStyle = MARKING_COLOR;
      ctx.fill();
  
      // Draw Diamonds on Rails
      ctx.save();
      ctx.fillStyle = '#fff9';
      const diamondLength = railWidth * 0.7;
      const diamondWidth = diamondLength * 0.4;
      function drawDiamond(cx, cy) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - diamondWidth / 2);
        ctx.lineTo(cx + diamondLength / 2, cy);
        ctx.lineTo(cx, cy + diamondWidth / 2);
        ctx.lineTo(cx - diamondLength / 2, cy);
        ctx.closePath();
        ctx.fill();
      }
      const diamondFracLong = [1/8, 2/8, 3/8, 5/8, 6/8, 7/8];
      const diamondFracShort = [1/4, 2/4, 3/4];
      for (let frac of diamondFracLong) {
        drawDiamond(tableBounds.left + frac * (tableBounds.right - tableBounds.left), tableBounds.top - railWidth * 0.5);
      }
      for (let frac of diamondFracLong) {
        drawDiamond(tableBounds.left + frac * (tableBounds.right - tableBounds.left), tableBounds.bottom + railWidth * 0.5);
      }
      for (let frac of diamondFracShort) {
        drawDiamond(tableBounds.left - railWidth * 0.5, tableBounds.top + frac * (tableBounds.bottom - tableBounds.top));
      }
      for (let frac of diamondFracShort) {
        drawDiamond(tableBounds.right + railWidth * 0.5, tableBounds.top + frac * (tableBounds.bottom - tableBounds.top));
      }
      ctx.restore();
    }
  
    /** Draws a single line path with specified color and width. */
    function drawLine(path, color, width) {
      if (!path || path.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    }
  
    /** Draws a straight line segment. */
    function drawSegment(start, end, color, width) {
      drawLine([start, end], color, width);
    }
  
    /** Draws a ball at the specified position. */
    function drawBall(x, y, radius, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  
    /** Draws a circle outline at the specified position. */
    function drawCircle(x, y, radius, color, width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  
    /** Renders the entire canvas content. */
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawPoolTable();
  
      if (isBankingMode) {
        if (isDrawing && bankingStartPoint && bankingCurrentEndPoint) {
          drawSegment(
            bankingStartPoint,
            bankingCurrentEndPoint,
            BANKING_INITIAL_LINE_COLOR,
            BANKING_LINE_WIDTH
          );
        }
        calculatedBankPath.forEach((segment) => {
          drawSegment(
            segment.start,
            segment.end,
            BANKING_PATH_COLOR,
            BANKING_LINE_WIDTH
          );
        });
      } else {
        // Draw all stored objects
        objects.forEach((obj) => {
          if (obj.type === 'ball') {
            drawBall(obj.x, obj.y, obj.radius, obj.color);
          } else if (obj.type === 'line') {
            drawSegment(
              { x: obj.x1, y: obj.y1 },
              { x: obj.x2, y: obj.y2 },
              obj.color,
              obj.width
            );
          } else if (obj.type === 'circle') {
            drawCircle(obj.x, obj.y, obj.radius, obj.color, obj.width);
          } else if (obj.type === 'free') {
            drawLine(obj.path, obj.color, obj.width);
          }
        });
  
        // Draw current in-progress drawing
        if (isDrawing && currentPath.length > 0) {
          if (drawingMode === 'free-draw') {
            drawLine(currentPath, drawingColor, DRAWING_LINE_WIDTH);
          } else if (drawingMode === 'draw-line' && currentPath.length >= 1) {
            drawSegment(currentPath[0], currentPath[currentPath.length - 1], drawingColor, DRAWING_LINE_WIDTH);
          } else if (drawingMode === 'draw-circle' && currentPath.length >= 1) {
            const start = currentPath[0];
            const end = currentPath[currentPath.length - 1];
            const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            drawCircle(start.x, start.y, radius, drawingColor, DRAWING_LINE_WIDTH);
          }
        }
      }
    }
  
    /** Resizes canvas and updates boundaries. */
    function resizeCanvas() {
      const displayWidth = canvasContainer.clientWidth;
      const displayHeight = canvasContainer.clientHeight;
      if (
        canvas.width !== displayWidth ||
        canvas.height !== displayHeight
      ) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        console.log(`Canvas resized to: ${canvas.width}x${canvas.height}`);
        updateTableBounds();
        render();
      } else {
        updateTableBounds();
      }
    }
  
    /** Gets coordinates from event. */
    function getCoordinates(event) {
      const rect = canvas.getBoundingClientRect();
      let x, y;
      if (event.touches && event.touches.length > 0) {
        x = event.touches[0].clientX - rect.left;
        y = event.touches[0].clientY - rect.top;
      } else if (
        event.clientX !== undefined &&
        event.clientY !== undefined
      ) {
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
      } else {
        return null;
      }
      return { x, y };
    }
  
    /** Calculates the bank path. */
    function calculateBankPath(startPoint, endPoint, maxBounces) {
      let pathSegments = [];
      let currentPoint = { ...startPoint };
      let dx = endPoint.x - startPoint.x;
      let dy = endPoint.y - startPoint.y;
      let magnitude = Math.sqrt(dx * dx + dy * dy);
      if (magnitude < EPSILON) return [];
      let dirX = dx / magnitude;
      let dirY = dy / magnitude;
  
      for (let bounce = 0; bounce <= maxBounces; bounce++) {
        let timeToHit = Infinity;
        let hitEdge = null;
        if (dirY < -EPSILON) {
          let t = (tableBounds.top - currentPoint.y) / dirY;
          if (t > EPSILON && t < timeToHit) {
            timeToHit = t;
            hitEdge = "top";
          }
        } else if (dirY > EPSILON) {
          let t = (tableBounds.bottom - currentPoint.y) / dirY;
          if (t > EPSILON && t < timeToHit) {
            timeToHit = t;
            hitEdge = "bottom";
          }
        }
        if (dirX < -EPSILON) {
          let t = (tableBounds.left - currentPoint.x) / dirX;
          if (t > EPSILON && t < timeToHit) {
            timeToHit = t;
            hitEdge = "left";
          }
        } else if (dirX > EPSILON) {
          let t = (tableBounds.right - currentPoint.x) / dirX;
          if (t > EPSILON && t < timeToHit) {
            timeToHit = t;
            hitEdge = "right";
          }
        }
  
        if (
          bounce === 0 &&
          (timeToHit === Infinity || timeToHit > magnitude)
        ) {
          pathSegments.push({ start: currentPoint, end: endPoint });
          break;
        }
        if (timeToHit === Infinity) {
          let finalEndPoint = {
            x: currentPoint.x + dirX * 1000,
            y: currentPoint.y + dirY * 1000,
          };
          pathSegments.push({ start: currentPoint, end: finalEndPoint });
          break;
        }
  
        let hitPoint = {
          x: currentPoint.x + dirX * timeToHit,
          y: currentPoint.y + dirY * timeToHit,
        };
        pathSegments.push({ start: currentPoint, end: hitPoint });
        if (bounce === maxBounces) break;
        if (hitEdge === "top" || hitEdge === "bottom") {
          dirY = -dirY;
        } else if (hitEdge === "left" || hitEdge === "right") {
          dirX = -dirX;
        }
        currentPoint = hitPoint;
      }
      return pathSegments;
    }
  
    /** Starts drawing (handles all modes). */
    function startDrawing(event) {
      event.preventDefault();
      const coords = getCoordinates(event);
      if (!coords) return;
      isDrawing = true;
  
      if (isBankingMode) {
        bankingStartPoint = coords;
        bankingCurrentEndPoint = coords;
        calculatedBankPath = [];
      } else {
        if (drawingMode === 'place-ball') {
          objects.push({ type: 'ball', x: coords.x, y: coords.y, radius: BALL_RADIUS, color: drawingColor });
          isDrawing = false; // Ball placement doesn't require continuous drawing
          render();
        } else if (drawingMode === 'erase') {
          // Find and remove the nearest object
          let idx = objects.findIndex(obj => {
            if (obj.type === 'ball' || obj.type === 'circle') {
              const dx = obj.x - coords.x, dy = obj.y - coords.y;
              return Math.sqrt(dx*dx + dy*dy) < (obj.radius + 10);
            } else if (obj.type === 'line') {
              const {x1, y1, x2, y2} = obj;
              const A = coords.x - x1, B = coords.y - y1, C = x2 - x1, D = y2 - y1;
              const dot = A * C + B * D;
              const len_sq = C * C + D * D;
              let param = -1;
              if (len_sq !== 0) param = dot / len_sq;
              let xx, yy;
              if (param < 0) { xx = x1; yy = y1; }
              else if (param > 1) { xx = x2; yy = y2; }
              else { xx = x1 + param * C; yy = y1 + param * D; }
              const dx = coords.x - xx, dy = coords.y - yy;
              return Math.sqrt(dx*dx + dy*dy) < 14;
            } else if (obj.type === 'free') {
              return obj.points.some(pt => {
                const dx = pt.x - coords.x, dy = pt.y - coords.y;
                return Math.sqrt(dx*dx + dy*dy) < 10;
              });
            }
            return false;
          });
          if (idx !== -1) objects.splice(idx, 1);
          isDrawing = false; // Erase doesn't require continuous drawing
          render();
        } else {
          currentPath = [coords]; // Start new path for free-draw, line, or circle
        }
      }
    }
  
    /** Continues drawing (handles all modes). */
    function draw(event) {
      if (!isDrawing) return;
      event.preventDefault();
      const coords = getCoordinates(event);
      if (!coords) return;
  
      if (isBankingMode) {
        bankingCurrentEndPoint = coords;
      } else {
        if (drawingMode === 'free-draw' || drawingMode === 'draw-line' || drawingMode === 'draw-circle') {
          currentPath.push(coords);
        }
      }
      render();
    }
  
    /** Stops drawing (handles all modes). */
    function stopDrawing(event) {
      if (!isDrawing) return;
      event.preventDefault();
      isDrawing = false;
  
      if (isBankingMode) {
        if (
          bankingStartPoint &&
          bankingCurrentEndPoint &&
          (bankingStartPoint.x !== bankingCurrentEndPoint.x ||
            bankingStartPoint.y !== bankingCurrentEndPoint.y)
        ) {
          calculatedBankPath = calculateBankPath(
            bankingStartPoint,
            bankingCurrentEndPoint,
            maxBanks
          );
        } else {
          bankingStartPoint = null;
          bankingCurrentEndPoint = null;
          calculatedBankPath = [];
        }
      } else {
        if (currentPath.length > 1) {
          if (drawingMode === 'free-draw') {
            objects.push({ type: 'free', path: [...currentPath], color: drawingColor, width: DRAWING_LINE_WIDTH });
          } else if (drawingMode === 'draw-line') {
            objects.push({
              type: 'line',
              x1: currentPath[0].x,
              y1: currentPath[0].y,
              x2: currentPath[currentPath.length - 1].x,
              y2: currentPath[currentPath.length - 1].y,
              color: drawingColor,
              width: DRAWING_LINE_WIDTH
            });
          } else if (drawingMode === 'draw-circle') {
            const start = currentPath[0];
            const end = currentPath[currentPath.length - 1];
            const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            if (radius > 0) {
              objects.push({
                type: 'circle',
                x: start.x,
                y: start.y,
                radius: radius,
                color: drawingColor,
                width: DRAWING_LINE_WIDTH
              });
            }
          }
        }
        currentPath = [];
      }
      render();
    }
  
    /** Clears all drawings and banking state. */
    function clearAllDrawings() {
      objects = [];
      currentPath = [];
      bankingStartPoint = null;
      bankingCurrentEndPoint = null;
      calculatedBankPath = [];
      isDrawing = false;
      render();
      console.log("All drawings cleared");
    }
  
    /** Undoes the last completed object. */
    function undoLastLine() {
      if (!isBankingMode && objects.length > 0) {
        objects.pop();
        render();
        console.log("Undo last object");
      }
    }
  
    /** Toggles Banking Mode */
    function toggleBankingMode() {
      isBankingMode = !isBankingMode;
      clearAllDrawings();
  
      func1Button.dataset.active = isBankingMode;
      func1Button.classList.toggle("bg-[#8B5A2B]", isBankingMode);
      func1Button.classList.toggle("text-[#F5F5F5]", isBankingMode);
      func1Button.classList.toggle("bg-[#543a29]", !isBankingMode);
      func1Button.classList.toggle("text-[#F5F5F5]", !isBankingMode);
      canvasContainer.classList.toggle("banking-active", isBankingMode);
      canvas.classList.toggle("banking-cursor", isBankingMode);
      bankingControlsDiv.classList.toggle("hidden", !isBankingMode);
      console.log("Banking Mode:", isBankingMode);
      render();
    }
  
    /** Updates max banks value and display. */
    function updateMaxBanks(delta) {
      let newValue = maxBanks + delta;
      if (newValue >= 0 && newValue <= 10) {
        maxBanks = newValue;
        maxBanksDisplay.textContent = maxBanks;
        maxBanksDisplay.classList.add("bg-[#2E8B57]", "transition", "duration-150");
        setTimeout(() => maxBanksDisplay.classList.remove("bg-[#2E8B57]"), 200);
        if (isBankingMode && bankingStartPoint && bankingCurrentEndPoint) {
          calculatedBankPath = calculateBankPath(
            bankingStartPoint,
            bankingCurrentEndPoint,
            maxBanks
          );
          render();
        }
      }
    }
  
    /** Toggles Dark/Light Theme */
    function toggleTheme() {
      document.body.classList.toggle("dark-mode");
      const isDarkMode = document.body.classList.contains("dark-mode");
      localStorage.setItem("theme", isDarkMode ? "dark" : "light");
      themeIconLight.classList.toggle("hidden", isDarkMode);
      themeIconDark.classList.toggle("hidden", !isDarkMode);
      themeToggleBtn.classList.add("ring-2", "ring-offset-2", "ring-[#8B5A2B]");
      setTimeout(
        () => themeToggleBtn.classList.remove("ring-2", "ring-offset-2", "ring-[#8B5A2B]"),
        300
      );
    }
  
    /** Applies saved theme on load */
    function applySavedTheme() {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        themeIconLight.classList.add("hidden");
        themeIconDark.classList.remove("hidden");
      } else {
        document.body.classList.remove("dark-mode");
        themeIconLight.classList.remove("hidden");
        themeIconDark.classList.add("hidden");
      }
    }
  
    // --- Initial Setup ---
    applySavedTheme();
    maxBanksDisplay.textContent = maxBanks;
    colorPickerBtn.style.background = drawingColor;
    colorPickerInput.value = drawingColor;
    resizeCanvas();
  
    // --- Event Listeners ---
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === canvasContainer) {
          resizeCanvas();
        }
      }
    });
    resizeObserver.observe(canvasContainer);
  
    // Drawing Listeners
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);
    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDrawing);
    canvas.addEventListener("touchcancel", stopDrawing);
  
    // Button Listeners
    clearAllButton.addEventListener("click", clearAllDrawings);
    undoButton.addEventListener("click", undoLastLine);
    themeToggleBtn.addEventListener("click", toggleTheme);
    func1Button.addEventListener("click", toggleBankingMode);
    func2Button.addEventListener("click", () => {
      console.log("Function 2 Clicked");
      alert("Function 2 Activated!");
    });
    optionsButton.addEventListener("click", () => {
      console.log("Options Clicked");
      alert("More options!");
    });
  
    // Banking Control Listeners
    decreaseBanksBtn.addEventListener("click", () => updateMaxBanks(-1));
    increaseBanksBtn.addEventListener("click", () => updateMaxBanks(1));
  
    // Color Picker Listener
    colorPickerInput.addEventListener("input", (e) => {
      drawingColor = e.target.value;
      colorPickerBtn.style.background = drawingColor;
    });
  
    // Control 1 Listeners
    control1Up.addEventListener("click", () => {
      control1Value++;
      control1Display.textContent = control1Value;
      control1Display.classList.add("bg-[#2E8B57]", "transition", "duration-150");
      setTimeout(() => control1Display.classList.remove("bg-[#2E8B57]"), 200);
    });
    control1Down.addEventListener("click", () => {
      control1Value--;
      control1Display.textContent = control1Value;
      control1Display.classList.add("bg-[#2E8B57]", "transition", "duration-150");
      setTimeout(() => control1Display.classList.remove("bg-[#2E8B57]"), 200);
    });
  
    // Drawing Mode Logic
    const modeRadios = document.querySelectorAll('input[name="drawing-mode"]');
    modeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          drawingMode = e.target.value;
          if (isBankingMode) toggleBankingMode(); // Disable banking mode if changing drawing mode
        }
      });
    });
  });