import BoundarySelector from './BoundarySelector';

class Chloropleth {
  constructor(colorBy, boundaries, dataPoints, minColor, maxColor) {
    this.colorBy = colorBy;
    this.boundaries = boundaries;
    this.dataPoints = dataPoints;
    this.minColor = minColor;
    this.maxColor = maxColor;

    this.boundaryObjects = this.computeChloroplethColors();
    console.log(this.boundaryObjects);
    this.polygons = [];
  }

  draw(map) {
    this.boundaryObjects.forEach((boundary) => {
      const points = boundary.boundary;
      let color = boundary.color;
      let opacity = 1;
      color = (color === null) ?
        (() => { opacity = 0.1; return this.minColor; })() : color;

      const polygon = map.addPolygon(points, color, opacity);
      this.addPolygonHoverListener(map.map, polygon, boundary);
      this.polygons.push(polygon);
    });
  }

  addPolygonHoverListener(map, polygon, info) {
    const average = info.average;
    const boundary = info.boundary;

    const contentString = `${this.colorBy}: ${average}`;
    const position = BoundarySelector.getCentroid(boundary);
    position.lat += 0.001;

    const infowindow = new google.maps.InfoWindow({
      map,
      position,
      content: contentString,
    });
    infowindow.close();
    google.maps.event.addListener(polygon, 'mouseover', () => {
      infowindow.open(map);
    });
    google.maps.event.addListener(polygon, 'mouseout', () => {
      infowindow.close();
    });
  }

  computeChloroplethColors() {
    let boundaryInfoObjects = [];
    this.boundaries.forEach((boundary) => {
      const info = this.getBoundaryInfo(boundary);
      boundaryInfoObjects = boundaryInfoObjects.concat(info);
    });

    const minMax = this.constructor.getBoundaryAveragesMinMax(boundaryInfoObjects);

    boundaryInfoObjects = this.computeBoundaryColors(
      minMax, boundaryInfoObjects);

    return boundaryInfoObjects;
  }

  // Returns an array with an object with the average of a given category
  // And the given boundary as attributes.
  getBoundaryInfo(boundary) {
    if (boundary === null) {
      return [];
    }

    const info = { boundary };
    const selector = new BoundarySelector(null);
    const pointsWithinBoundary = selector.getPointsInBoundary(this.dataPoints, boundary);
    info.points = pointsWithinBoundary;

    const result = this.constructor.getAverageOfField(pointsWithinBoundary,
        this.colorBy);
    info.average = result.average;
    info.values = result.values;
    return [info];
  }

  static getAverageOfField(points, field) {
    let sum = 0;
    let num = 0;
    const values = [];
    points.forEach((point) => {
      const value = parseFloat(point[field]);
      if (value !== null && !isNaN(value)) {
        sum += value;
        num += 1;
      }
      values.push(value);
    });

    const average = (num === 0) ? null : sum / num;
    return { average, values };
  }

  static getBoundaryAveragesMinMax(infoObjects) {
    if (infoObjects.length === 0) {
      return { min: null, max: null }; // Edge case
    }

    let min = infoObjects[0].average;
    let max = min;
    for (let i = 0; i < infoObjects.length; i += 1) {
      const value = infoObjects[i].average;
      if (value !== null) {
        if (value < min) {
          min = value;
        }
        if (value > max) {
          max = value;
        }
      }
    }

    return { min, max };
  }

  computeBoundaryColors(minMax, boundaryObjects) {
    const getColor = d3.scaleLinear()
      .domain([minMax.min, minMax.max])
      .range([this.minColor, this.maxColor]);

    const newBoundaryObjects = [];
    for (let i = 0; i < boundaryObjects.length; i += 1) {
      const boundaryObject = boundaryObjects[i];
      const value = boundaryObject.average;
      if (value !== null) {
        boundaryObject.color = getColor(boundaryObject.average);
      } else {
        boundaryObject.color = null;
      }
      newBoundaryObjects.push(boundaryObject);
    }
    return newBoundaryObjects;
  }
}
export default Chloropleth;
