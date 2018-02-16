var express = require('express')
var router  = express.Router()
var PF = require('pathfinding')
var floodFill = require("n-dimensional-flood-fill")
var dist = require('manhattan')

// Handle POST request to '/start'
router.post('/start', function (req, res) {  
  // Response data
  var data = {
    color: "#FF69B4",
    name: "Shiffany",
    secondary_color: "#CD5C5C",
    head_url: "https://rdbrck.com/wp-content/uploads/2016/09/shift_icon@2x.png",
    tail_type: 'curled',
    head_type: 'bendr'
  }

  return res.json(data)
})

// Handle POST request to '/move'
router.post('/move', function (req, res) {
  // define some global variables
  var taunts = ["Can't beat Redbrickers at ping pong", "Meet the spinmaaaaassstaaaaa", "Let's go for a spinnnn"]
  var generatedMove = undefined
  var cornerMove = checkCorners(req.body)
  var possibleMoves = ['up', 'down', 'left', 'right']
  var bodyParam = req.body
  var body = req.body.you.body.data
  var snakes = req.body.snakes.data
  var grid = new PF.Grid(req.body.width, req.body.height)
  var backupGrid = grid.clone()
  var closestFood = []
  var foodMove = ''
  var tailMove = ''
  var gridData = []
  var largest = 0
  var largestFloodFillMove
  var seed
  var result
  var floodFillResults = []
  var possibleWallMoves = checkWalls(req.body)
  var myID = req.body.you.id
  var otherSnakeHeads = []
  var updatedOtherSnakeHeads = []
  var floodFillDepth = 8
  var flagLimited = false
  var flag = false
  var allLimitedLengths = []
  var allLengths = []
  var getter = function (x, y) {
    return gridData[y][x]
  }

  storeHeadsOfOtherSnakes(snakes, otherSnakeHeads, myID)
  appendFakeHeadsToSnakes(otherSnakeHeads, updatedOtherSnakeHeads, bodyParam)
  createEmptyFFGrid(bodyParam, gridData)
  setUnwalkableGridAreas(body, backupGrid, snakes, updatedOtherSnakeHeads)
  setWalkableGridAreas(backupGrid, body, snakes, myID)
  initializeFFGrid(backupGrid, gridData)
  removeWallMoves(possibleMoves, possibleWallMoves)
  removeSnakeCollisionMoves(possibleMoves, gridData, body)

  // perform a flood fill
  possibleMoves.forEach(function (move) {
    var testOnFlood = []
    var testOnFloodSmaller = []

    if (move === 'up' && body[0].y - 1 > -1) {
      seed = [body[0].x, body[0].y - 1]
      result = floodFill({
        getter: getter,
        seed: seed,
        onFlood: function (x, y) {
          testOnFlood.push(dist([x, y], [body[0].x, body[0].y]))
          testOnFloodSmaller.push(dist([x, y], [body[0].x, body[0].y]))
        }
      })
      floodFillResults.push({ move, floodLengthLimited: testOnFlood.filter(distance => distance < floodFillDepth).length, floodLength: result.flooded.length })
    } else if (move === 'down' && body[0].y + 1 < bodyParam.height) {
      seed = [body[0].x, body[0].y + 1]
      result = floodFill({
        getter: getter,
        seed: seed,
        onFlood: function (x, y) {
          testOnFlood.push(dist([x, y], [body[0].x, body[0].y]))
          testOnFloodSmaller.push(dist([x, y], [body[0].x, body[0].y]))
        }
      })
      floodFillResults.push({ move, floodLengthLimited: testOnFlood.filter(distance => distance < floodFillDepth).length, floodLength: result.flooded.length })
    } else if (move === 'left' && body[0].x - 1 > -1) {
      seed = [body[0].x - 1, body[0].y]
      result = floodFill({
        getter: getter,
        seed: seed,
        onFlood: function (x, y) {
          testOnFlood.push(dist([x, y], [body[0].x, body[0].y]))
          testOnFloodSmaller.push(dist([x, y], [body[0].x, body[0].y]))
        }
      })
      floodFillResults.push({ move, floodLengthLimited: testOnFlood.filter(distance => distance < floodFillDepth).length, floodLength: result.flooded.length })
    } else if (move === 'right' && body[0].x + 1 < bodyParam.width) {
      seed = [body[0].x + 1, body[0].y]
      result = floodFill({
        getter: getter,
        seed: seed,
        onFlood: function (x, y) {
          testOnFlood.push(dist([x, y], [body[0].x, body[0].y]))
          testOnFloodSmaller.push(dist([x, y], [body[0].x, body[0].y]))
        }
      })
      floodFillResults.push({ move, floodLengthLimited: testOnFlood.filter(distance => distance < floodFillDepth).length, floodLength: result.flooded.length })
    }
  })

  storeFFLengths(floodFillResults, allLengths, allLimitedLengths)
  
  // check if all the normal FF lengths and all the limited FF lengths are equal or if there is a preferred direction
  for (var i = 0; i < allLengths.length - 1; i++) {
    if (allLengths[i] !== allLengths[i + 1]) {
      flag = true
    }
  }
  for (var j = 0; j < allLimitedLengths.length - 1; j++) {
    if (allLimitedLengths[j] !== allLimitedLengths[j + 1]) {
      flagLimited = true
    }
  }
  
  // get the move with the largest flood fill value
  var largestValueLimited = floodFillResults[0].floodLengthLimited
  var largestValue = floodFillResults[0].floodLength
  var largestMove = floodFillResults[0].move
  var largestMoveLimited = floodFillResults[0].move

  floodFillResults.forEach(function (object) {
    if (object.floodLengthLimited > largestValueLimited) {
      largestValueLimited = object.floodLengthLimited
      largestMoveLimited = object.move
    }
    if (object.floodLength > largestValue) {
      largestValue = object.floodLength
      largestMove = object.move
    }
  })

  checkForHeadCollisions(bodyParam, otherSnakeHeads, possibleMoves)

  console.log(floodFillResults)
  console.log('flag', flag)
  console.log('flaglimited', flagLimited)
  console.log('largestmove', largestMove)
  console.log('largestmovelimited', largestMoveLimited)

  // generate a move
  if (cornerMove !== false) { // we are at a corner
    generatedMove = cornerMove
  } else {
    if (req.body.you.health < 85) { // we are hungry
      closestFood = foodSearch(req.body)
      foodMove = pathToFood(closestFood, req.body, backupGrid, floodFillResults, flag, flagLimited, largestMove, largestMoveLimited)
      if (foodMove !== false) {
        generatedMove = foodMove
      } else {
        generatedMove = pathToTail(bodyParam, backupGrid, possibleMoves, floodFillResults)
      }
    } else { // find path to tail if not hungry
      tailMove = pathToTail(bodyParam, backupGrid, possibleMoves, flag, flagLimited, largestMove, largestMoveLimited)
      if (tailMove !== false && tailMove !== undefined) {
        generatedMove = tailMove
      }
    }
  }

  // last minute check
  if (generatedMove === false || generatedMove === undefined) {
    console.log('in last min check')
    if (!flagLimited && !flag) {
      generatedMove = largestMoveLimited
    } else if (flag && !flagLimited) {
      generatedMove = largestMoveLimited
    } else if (!flag && flagLimited) {
      generatedMove = largestMove
    } else {
      generatedMove = largestMove
    }
  }

  // Response data
  var data = {
    move: generatedMove,
    taunt: taunts[Math.floor(Math.random()*taunts.length)]
  }

  return res.json(data)
})

// find and return the first move that leads to our tail
function pathToTail(data, grid, possibleMoves, flag, flagLimited, largestMove, largestMoveLimited) {
  var bodyData = data.you.body.data
  var finder = new PF.AStarFinder()
  var gridBackup = grid.clone()

  // set parts of the grid that are unwalkable
  bodyData.forEach(function (object) {
    gridBackup.setWalkableAt(object.x, object.y, false)
  })
  data.snakes.data.forEach(function (snake) {
    snake.body.data.forEach(function (object) {
      gridBackup.setWalkableAt(object.x, object.y, false)
    })
  })

  // set our own head and tail as walkable points
  gridBackup.setWalkableAt(bodyData[0].x, bodyData[0].y, true)
  gridBackup.setWalkableAt(bodyData[bodyData.length - 1].x, bodyData[bodyData.length - 1].y, true)

  var path = finder.findPath(bodyData[0].x, bodyData[0].y, bodyData[bodyData.length - 1].x, bodyData[bodyData.length - 1].y, gridBackup)

  if (path.length === 0 || path.length === 1) {
    return false
  }

  if (path[1][0] === path[0][0]) { // same x coordinates
    if (path[1][1] !== path[0][1]) { // different y coordinates
      if (path[1][1] < path[0][1] && possibleMoves.includes('up')) {
        return 'up'
      } else if (path[1][1] > path[0][1] && possibleMoves.includes('down')) {
        return 'down'
      }
    }
  } else if (path[1][1] === path[0][1]) { // same y coordinates
    if (path[1][0] !== path[0][0]) { // different x coordinates
      if (path[1][0] > path[0][0] && possibleMoves.includes('right')) {
        return 'right'
      } else if (path[1][0] < path[0][0] && possibleMoves.includes('left')) {
        return 'left'
      }
    }
  }
}

// function that returns a move that gets you closest to the nearest piece of food if a path exists to the food
function pathToFood(closestFood, data, grid, floodFillResults, flag, flagLimited, largestMove, largestMoveLimited) {
  var bodyData = data.you.body.data
  var snakes = data.snakes.data
  var finder = new PF.AStarFinder()
  var gridBackup = grid.clone()

  bodyData.forEach(function (object) {
    gridBackup.setWalkableAt(object.x, object.y, false)
  })
  gridBackup.setWalkableAt(bodyData[bodyData.length - 1].x, bodyData[bodyData.length - 1].y, true)

  data.snakes.data.forEach(function (snake) {
    snake.body.data.forEach(function (object) {
      gridBackup.setWalkableAt(object.x, object.y, false)
    })
  })

  var path = finder.findPath(bodyData[0].x, bodyData[0].y, closestFood[1].x, closestFood[1].y, gridBackup)

  if (path.length === 0) {
    return false
  }

  var checkPossibleMoves = []
  floodFillResults.forEach(function (object) {
    checkPossibleMoves.push(object.move)
  })
  
  if (path[1][0] === bodyData[0].x) { // don't turn left or right
    if (path[1][1] === bodyData[0].y - 1 && checkPossibleMoves.includes('up')) { // go up
      if (!flag && !flagLimited) {
        return 'up'
      } else if (flagLimited && largestMoveLimited === 'up') {
        return 'up'
      } else if (flag && largestMove === 'up') {
        return 'up'
      }
    } else if (path[1][1] === (bodyData[0].y + 1) && checkPossibleMoves.includes('down')) { // go down
      if (!flag && !flagLimited) {
        return 'down'
      } else if (flagLimited && largestMoveLimited === 'down') {
        return 'down'
      } else if (flag && largestMove === 'down') {
        return 'down'
      }
    }
  } else if (path[1][1] === bodyData[0].y) { // don't turn up or down
    if (path[1][0] === (bodyData[0].x - 1) && checkPossibleMoves.includes('left')) { // go left
      if (!flag && !flagLimited) {
        return 'left'
      } else if (flagLimited && largestMoveLimited === 'left') {
        return 'left'
      } else if (flag && largestMove === 'left') {
        return 'left'
      }
    } else if (path[1][0] === bodyData[0].x + 1 && checkPossibleMoves.includes('right')) { // go right
      if (!flag && !flagLimited) {
        return 'right'
      } else if (flagLimited && largestMoveLimited === 'right') {
        return 'right'
      } else if (flag && largestMove === 'right') {
        return 'right'
      }
    }
  }
}

// helper function to calculate the distance between two coordinate points
function distance(point1, point2) { // calculate distance between two points
  return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2))
}

// helper function to remove a specified element from an array
function removeElement(array, element) {
  var index = array.indexOf(element)

  if (index !== -1) {
    array.splice(index, 1)
  }
}

// function that finds the closest piece of food to our head
function foodSearch(data) {
  var foodData = data.food.data // food
  var bodyData = data.you.body.data // body coordinates
  var distancesToFood = []
  var closestFood = []

  foodData.forEach(function (object) {
    distancesToFood.push(object)
    distancesToFood.push(distance(object, bodyData[0]))
  })

  var min = distancesToFood[1]
  var index = 0
  var object = {}
  for (var i = 0; i < distancesToFood.length; i++) {
    if (i % 2 !== 0) {
      if (distancesToFood[i] < min) {
        min = distancesToFood[i]
        index = i - 1
      }
    }
  }
  object = distancesToFood[index]
  closestFood.push(min, object)
  return closestFood // [distance to closest food, { coordinates of closest food }]
}

// function to check if we are at a wall
function checkWalls(data) {
  var bodyData = data.you.body.data
  var health = data.you.health
  if (bodyData[0].x === 0) { // left wall
    if (bodyData[1].x === 1) { // approaching from right
      return ['up', 'down']
    } else if (bodyData[1].y === bodyData[0].y - 1) { // approaching from up
      return ['right', 'down']
    } else if (bodyData[1].y === bodyData[0].y + 1) { // approaching from down
      return ['right', 'up']
    } else {
      return ['right', 'up', 'down']
    }
  } else if (bodyData[0].x === data.width - 1) { // right wall
    if (bodyData[1].x === bodyData[0].x - 1) { // approaching from left
      return ['up', 'down']
    } else if (bodyData[1].y === bodyData[0].y - 1) { // approaching from up
      return ['left', 'down']
    } else if (bodyData[1].y === bodyData[0].y + 1) { // approaching from down
      return ['left', 'up']
    } else {
      return ['up', 'down', 'left']
    }
  } else if (bodyData[0].y === 0) { // up wall
    if (bodyData[1].y === bodyData[0].y + 1) { // approaching from down
      return ['left', 'right']
    } else if (bodyData[1].x === bodyData[0].x - 1) { // approaching from left
      return ['down', 'right']
    } else if (bodyData[1].x === bodyData[0].x + 1) { // approaching from right
      return ['down', 'left']
    } else {
      return ['left', 'right', 'down']
    }
  } else if (bodyData[0].y === data.height - 1) { // down wall
    if (bodyData[1].y === bodyData[0].y - 1) { // approaching from up
      return ['left', 'right']
    } else if (bodyData[1].x === bodyData[0].x - 1) { // approaching from left
      return ['up', 'right']
    } else if (bodyData[1].x === bodyData[0].x + 1) { // approaching from right
      return ['up', 'left']
    } else {
      return ['up', 'left', 'right']
    }
  } else {
    return false // if we are not at a wall
  }
}

// function to check if we are at a corner of the game board
function checkCorners(data) {
  var bodyData = data.you.body.data
  if (bodyData[0].x === 0 && bodyData[0].y === 0) { // up left corner
    if (bodyData[1].y === 1) { // approaching from down
      return 'right'
    } else if (bodyData[1].x === 1) { // approaching from right
      return 'down'
    }
  } else if (bodyData[0].x === data.width - 1 && bodyData[0].y === 0) { // up right corner
    if (bodyData[1].x === data.width - 2) { // approaching from left
      return 'down'
    } else if (bodyData[1].y === 1) { // approaching from down
      return 'left'
    }
  } else if (bodyData[0].x === 0 && bodyData[0].y === data.height - 1) { // down left corner
    if (bodyData[1].y === data.height - 2) { // approaching from up
      return 'right'
    } else if (bodyData[1].x === 1) { // approaching from right
      return 'up'
    }
  } else if (bodyData[0].x === data.width - 1 && bodyData[0].y === data.height - 1) { // down right corner
    if (bodyData[1].y === data.height - 2) { // approaching from up
      return 'left'
    } else if (bodyData[1].x === data.width - 2) { // approaching from left
      return 'up'
    }
  } else {
    return false // if not at a corner
  }
}

// function to store all the head and tail locations of other snakes
function storeHeadsOfOtherSnakes(snakes, otherSnakeHeads, myID) {
  snakes.forEach(function (snake) {
    if (snake.id !== myID) {
      otherSnakeHeads.push({ x: snake.body.data[0].x, y: snake.body.data[0].y, length: snake.length, id: snake.id })
    }
  })
}

// function to append fake heads to each of the heads of the other snakes for pessimistic flood fill
function appendFakeHeadsToSnakes(otherSnakeHeads, updatedOtherSnakeHeads, bodyParam) {
  otherSnakeHeads.forEach(function (object) {
    if (object.x - 1 >= 0) { 
      updatedOtherSnakeHeads.push({ x: object.x - 1, y: object.y }) 
    } 
    if (object.x + 1 < bodyParam.width) { 
      updatedOtherSnakeHeads.push({ x: object.x + 1, y: object.y }) 
    } 
    if (object.y - 1 >= 0) { 
      updatedOtherSnakeHeads.push({ x: object.x, y: object.y - 1 }) 
    } 
    if (object.y + 1 < bodyParam.height) { 
      updatedOtherSnakeHeads.push({ x: object.x, y: object.y + 1 }) 
    } 
  })

  // also push all values in othersnakeshead into updatedothersnakeshead 
  otherSnakeHeads.forEach(function (object) { 
    updatedOtherSnakeHeads.push(object) 
  })
}

// function to create the empty new grid 2d array for flood fill
function createEmptyFFGrid(bodyParam, gridData) {
  for (var j = 0; j < bodyParam.height; j++) {
    var row = []
    for (var k = 0; k < bodyParam.width; k++) {
      row.push(1)
    }
    gridData.push(row)
  }
}

// function to mark all the unwalkable parts of the grid
function setUnwalkableGridAreas(body, backupGrid, snakes, updatedOtherSnakeHeads) {
  // set all body points as unwalkable in the backup grid
  body.forEach(function (object) {
    backupGrid.setWalkableAt(object.x, object.y, false)
  })

  // set all snake points as unwalkable in the backup grid
  snakes.forEach(function (snake) {
    snake.body.data.forEach(function (object) {
      backupGrid.setWalkableAt(object.x, object.y, false)
    })
  })

  // set all snake fake heads as unwalkable in the backup grid
  updatedOtherSnakeHeads.forEach(function (head) {
    backupGrid.setWalkableAt(head.x, head.y, false)
  })
}

// function to mark all the walkable parts of the grid
function setWalkableGridAreas(backupGrid, body, snakes, myID) {
  // need to set all places where body of myself or other snakes will disappear as walkable
  snakes.forEach(function (snake) {
    if (snake.id !== myID && snake.health !== 100) {
      snake.body.data.reverse().forEach(function (object, index) {
        if (dist([body[0].x, body[0].y], [object.x, object.y]) > index) {
          backupGrid.setWalkableAt(object.x, object.y, true)
        }
      })
    } else {
        if (snake.length > 3 && snake.health < 100) {
          snake.body.data.reverse().forEach(function (object, index) {
          if (dist([body[0].x, body[0].y], [object.x, object.y]) > index) {
            backupGrid.setWalkableAt(object.x, object.y, true)
          }
        })
      }
    }
  })
}

// function to initialize the grid for flood fill with 0s if not walkable
function initializeFFGrid(backupGrid, gridData) {
  backupGrid.nodes.forEach(function (node) {
    node.forEach(function (object) {
      gridData[object.x] = gridData[object.x] || []
      if (!object.walkable) {
        gridData[object.y][object.x] = 0
      }
    })
  })
}

// function to check if at a wall and remove moves from possible moves accordingly
function removeWallMoves(possibleMoves, possibleWallMoves) {
  if (possibleWallMoves !== false) {
    if (!possibleWallMoves.includes('up')) { // at top wall
      removeElement(possibleMoves, 'up')
    } else if (!possibleWallMoves.includes('down')) { // at down wall
      removeElement(possibleMoves, 'down')
    } else if (!possibleWallMoves.includes('left')) { // at left wall
      removeElement(possibleMoves, 'left')
    } else if (!possibleWallMoves.includes('right')) { // at right wall
      removeElement(possibleMoves, 'right')
    }
  }
}

// function to update possible moves based on where we are and where other snakes are
function removeSnakeCollisionMoves(possibleMoves, gridData, body) {
  if (possibleMoves.includes('left') && gridData[body[0].y][body[0].x - 1] !== 1) {
    removeElement(possibleMoves, 'left')
  } 
  if (possibleMoves.includes('right') && gridData[body[0].y][body[0].x + 1] !== 1) {
    removeElement(possibleMoves, 'right')
  } 
  if (possibleMoves.includes('up') && (gridData[body[0].y - 1]) !== undefined && gridData[body[0].y - 1][body[0].x] !== 1) {
    removeElement(possibleMoves, 'up')
  } 
  if (possibleMoves.includes('down') && (gridData[body[0].y + 1]) !== undefined && gridData[body[0].y + 1][body[0].x] !== 1) {
    removeElement(possibleMoves, 'down')
  }
}

// function to store all the limited and complete flood fill lengths
function storeFFLengths(floodFillResults, allLengths, allLimitedLengths) {
  floodFillResults.forEach(function (object) {
    allLimitedLengths.push(object.floodLengthLimited)
    allLengths.push(object.floodLength)
  })
}

// function to check for head on head collisions
function checkForHeadCollisions(bodyParam, otherSnakeHeads, possibleMoves) {
  otherSnakeHeads.forEach(function (object) {
    if (bodyParam.you.length > object.length) {
      // if snake head two spaces to right of my head
      if (bodyParam.you.body.data[0].x + 2 !== undefined && object.x === bodyParam.you.body.data[0].x + 2 && object.y === bodyParam.you.body.data[0].y) {
        possibleMoves.push('right')
        // if snake head two spaces to left of my head
      } else if (bodyParam.you.body.data[0].x - 2 !== undefined && object.x === bodyParam.you.body.data[0].x - 2 && object.y === bodyParam.you.body.data[0].y) {
        possibleMoves.push('left')
        // if snake head two spaces above my head
      } else if (bodyParam.you.body.data[0].y - 2 !== undefined && object.y === bodyParam.you.body.data[0].y - 2 && object.x === bodyParam.you.body.data[0].x) {
        possibleMoves.push('up')
        // if snake head two spaces below my head
      } else if (bodyParam.you.body.data[0].y + 2 !== undefined && object.y === bodyParam.you.body.data[0].y + 2 && object.x === bodyParam.you.body.data[0].x) {
        possibleMoves.push('down')
        // if snake head one down
      } else if (bodyParam.you.body.data[0].y + 1 !== undefined && object.y === bodyParam.you.body.data[0].y + 1) {
        // and one to right of my head
        if (bodyParam.you.body.data[0].x + 1 !== undefined && object.x === bodyParam.you.body.data[0].x + 1) {
          possibleMoves.push('right', 'down')
          // and one to left of my head
        } else if (bodyParam.you.body.data[0].x - 1 !== undefined && object.x === bodyParam.you.body.data[0].x - 1) {
          possibleMoves.push('left', 'down')
        }
        // if snake head one above
      } else if (bodyParam.you.body.data[0].y - 1 !== undefined && object.y === bodyParam.you.body.data[0].y - 1) {
        // and one to right of my head
        if (bodyParam.you.body.data[0].x + 1 !== undefined && object.x === bodyParam.you.body.data[0].x + 1) {
          possibleMoves.push('right', 'up')
          // and one to left of my head
        } else if (bodyParam.you.body.data[0].x - 1 !== undefined && object.x === bodyParam.you.body.data[0].x - 1) {
          possibleMoves.push('left', 'up')
        }
      }
    }
  })
}

module.exports = router
