// I stole the basic idea of the noise field from here: https://www.youtube.com/watch?v=1-QXuR-XX_s

let points = [];
let mult, linecolor, fruit, hSize, bSize, bSpace;
let zoff = 0;
let monoSynth0, monoSynth1, monoSynth2, monoSynth3, a, d, s, r, reverb, rTime, rDecay, rMix, vel;
let synthVoices = [];
let outMinLog, outMaxLog, scl;
let onOff = false;

function preload() {
  table = loadTable('seasonal_fruit.csv', 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(25);
  frameRate(30);
  angleMode(DEGREES);
  noiseDetail(10, 0.48);
  reverb = new p5.Reverb();

  if (width > 500) {
    hSize = 60;
    bSize = 18;
    bSpace = 80;
  } else {
    hSize = 30;
    bSize = 7;
    bSpace = 47;
  }

  fill(230)
   .strokeWeight(1)
   .textSize(hSize);
  textStyle(BOLD);
  textFont('Courier New');
  textAlign(LEFT, TOP);
  headline = text('Flowing Fruit', 20, 20, width - 40);
  text('Flowing Fruit', 20, 20, width - 40);

  fill(230)
   .strokeWeight(1)
   .textSize(bSize);
  textStyle(NORMAL);
  textFont('Courier New');
  textAlign(LEFT, TOP);
  var bodyText = '(and veggies)\n\n\nWhat you\'ll see:\n - A randomly generated series of points will start to draw lines\n - The "curviness" of the lines is determined by how seasonal the item is\n - The number of lines is determined by the popularity of the item\n - The color is determined by the time of year that the item hits its peak\n\n\nWhat you\'ll hear:\n - The notes are randomly generated in C major\n - Notes have more abrupt attack/release when there is more seasonality\n - The amount of reverb is determined by the popularity of the item\n\n\nPick a fruit or veggie below and have fun exploring!'
  text(bodyText, 20, bSpace, width - 40);

  this.itemSelect = createSelect();

  var fruitList = table.getColumn('PRODUCT_CATEGORY');
  var dd = sort(fruitList,fruitList.length)
  for(var i = 0; i < fruitList.length ; i++) {
    this.itemSelect.option(dd[i]);
  }

  var selectw = itemSelect.size().width
  var selecth = itemSelect.size().height
  var selectx = (width / 2) - (selectw / 2.1)
  var selecty = height - selecth - 10

  this.itemSelect.position(selectx, selecty);
  this.itemSelect.changed(restartDrawing);
}

function restartDrawing() {
  points = [];
  background(25);
  var fruit = itemSelect.value();
  var row = table.findRow(fruit, 'PRODUCT_CATEGORY');
  var sales = parseFloat(row.getString('YEARLY_QUANTITY_RANK_SCALED'));
  var season = parseFloat(row.getString('SEASONAL_RANGE_RANK_SCALED'));
  var peak = parseFloat(row.getString('PEAK_DAY_SCALED'));
  var density = map(sales, 0, 1, 5, 40);
  var space = width / density;

  // synth
  vel = 0.7;

  a = map(season, 0, 1, 0.8, 0.01);
  d = 0.7;
  s = 0.6;
  r = map(season, 0, 1, 2, 0.5);

  rTime = 5;
  rDecay = map(sales, 0, 1, 10, 2);
  rMix = map(sales, 0, 1, 0.1, 0.95);

  playSynth(a, d, s, r, vel, rTime, rDecay, rMix);
  //end synth

  for (var x = 0; x < width + (2*space); x += space) {
    for (var y = 0; y < height + (2*space); y += space) {
      var p = createVector(x - space + random(-10, 10), y - space + random(-10, 10));
      points.push(p);
    }
  }

  shuffle(points, true);

  if (peak < 0.25) {
    linecolor = lerpColor(color('DeepSkyBlue'), color('green'), map(peak, 0, 0.25, 0, 1));
  } else if (peak < 0.5) {
    linecolor = lerpColor(color('green'), color('yellow'), map(peak, 0.25, 0.5, 0, 1));
  } else if (peak < 0.75) {
    linecolor = lerpColor(color('yellow'), color('orange'), map(peak, 0.5, 0.75, 0, 1));
  } else {
    linecolor = lerpColor(color('orange'), color('DeepSkyBlue'), map(peak, 0.75, 1, 0, 1));
  }
  
  if (width > 500) {
    thickMult = map(season, 0, 1, 2, 4);
  } else {
    thickMult = map(season, 0, 1, 1, 2);
  }

  // mult = map(season, 0, 1, 0.0001, 0.008);
  mult = mapLog(season, 0, 1, 0.0001, 0.008);
  alphaMult = map(season, 0, 1, 100, 50);
  zoff += 1;
}

function draw() {
  noStroke();

  if (frameCount * 3 <= points.length) {
    maxThing = frameCount * 3;
  } else {
    maxThing = points.length;
  }

  for (var i = 0; i < maxThing; i++) {
    linecolor.setAlpha(alphaMult);
    fill(linecolor);
    var xp = (points[i].x) * mult;
    var yp = (points[i].y) * mult;
    var angle = map(noise(xp, yp, zoff), 0, 1, 0, 1080);
    points[i].add(createVector(cos(angle), sin(angle)));
    ellipse(points[i].x, points[i].y, thickMult);
  }
}

// this is to remove consecutive repeated notes in the random arpeggiator below
function deDupe(array) {
    var newArray = [];
    newArray.push(array[0]);
    for(var i = 0; i < array.length -1; i++) {
        if(array[i] != array[i + 1]) {
            newArray.push(array[i + 1]);
        }
    }
    return newArray;
}

function playSynth(a1, d1, s1, r1, vel1, rTime1, rDecay1, rMix1) {
  userStartAudio();

  monoSynth0 = new p5.MonoSynth();
  monoSynth1 = new p5.MonoSynth();
  monoSynth2 = new p5.MonoSynth();
  monoSynth3 = new p5.MonoSynth();

  synthVoices = [monoSynth0, monoSynth1, monoSynth2, monoSynth3];

  for (v = 0; v < synthVoices.length; v++) {
    synth = synthVoices[v];
    synth.amp(0.2);
    synth.setADSR(a1, d1, s1, r1);
    synth.disconnect();
    reverb.process(synth, rTime1, rDecay1);
  }

  reverb.drywet(rMix1);

  let arpLen = 100;
  let scale = ['C3', 'D3', 'E3', 'F3', 'G3', 'A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'A5', 'B5', 'C5'];

  // create arpeggio
  let arp = [];
  for (i = 0; i < arpLen; i++) {
    arp.push(random(scale));
  }

  arp = deDupe(arp);

  for (n = 0; n < arp.length; n++) {
      voiceNum = n % 4;
      note = arp[n];
      synthVoices[voiceNum].play(note, vel1, n, r1);
  }
}

function mapLog(num, inMin, inMax, outMin, outMax) {
  // outMin should be greater than 0
  outMinLog = Math.log(outMin);
  outMaxLog = Math.log(outMax);
  scl = (outMaxLog - outMinLog) / (inMax - inMin);

  return Math.exp(outMinLog + scl*(num - inMin));
}

function mousePressed() {
  for (v = 0; v < synthVoices.length; v++) {
    synthVoices[v].dispose();
  }
}
