const animals = ['cat', 'dog', 'unicorn', 'bear', 'mouse'];
const colors = ['blue', 'red', 'orange', 'green', 'purple'];

/**
 * This creates a simple data store for datagrid to consume.
 */
class ExampleDataGenerator {
  cols = [];
  rows = [];
  returnEmptyRows = false;

  getRowStore = () => {
    return {
      getItems: (start, end, rowHandler) => {
        rowHandler(this.rows);
      }
    };
  };

  constructor (colSize, rowSize) {
    this.addCols(colSize);
    this.addRows(colSize, rowSize);
  }

  /**
   * Create colSize amount of cols with unique dataKeys using an animal name + index
   */
  addCols(colSize) {
    let animalIdx = 0;
    for (let i = 0; i < colSize; i++) {
      animalIdx = (animalIdx + 1) % animals.length;
      const colVal = animals[animalIdx] + i.toString();
      this.cols.push({
        name: colVal,
        dataKey: colVal,
        headerText: colVal
        // cellFormatter: ExampleCellFormatterFactory,
        // headerFormatter: ExampleHeaderFormatterFactory
      });
    }
  }

  /**
   * Create a rowSize amount of rows, with colSize amount of data for each column
   */
  addRows(colSize, rowSize) {
    let colorsIdx = 0;
    for (let i = 0; i < rowSize; i++) {
      const key = i.toString();
      let data = {};
      for (let j = 0; j < colSize; j++) {
        const dataKey = this.cols[j].dataKey;
        colorsIdx = (colorsIdx + 1) % colors.length;
        data[dataKey] = colors[colorsIdx] + i.toString();
      }
      this.rows.push({
        key: key,
        data: data
      });
    }
  }
}

export {
  ExampleDataGenerator
};
