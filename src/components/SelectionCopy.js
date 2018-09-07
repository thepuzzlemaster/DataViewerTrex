export function CopySelectionToClipboard(cellRanges, cols, rows) {
  let copyTextArray = [];

  cellRanges.forEach(range => {
    const colStartIndex = range.begin.colIdx;
    const colEndIndex = range.end.colIdx;
    const rowStartIndex = range.begin.rowIdx;
    const rowEndIndex = range.end.rowIdx;
    let rangeArray = [];
    let rowArray;

    for (var r = rowStartIndex; r <= rowEndIndex; r ++) {
      rowArray = [];
      for (var c = colStartIndex; c <= colEndIndex; c ++) {
        let columnKey = cols[c].dataKey;
        let rowData = rows[r].data;
        rowArray.push(rowData[columnKey]);
      }
      rangeArray.push(rowArray.join('\u00A0'));
    }

    copyTextArray.push(rangeArray);
  });

  let copyString = copyTextArray.map(range => range.join('\n')).join('\n\n');

  let textarea = document.createElement('textarea');
  textarea.id = 'CopyTextarea';
  textarea.style.cssText = 'position: absolute; opacity: 0';
  textarea.value = copyString;
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    document.execCommand('copy');
  } catch (error) {
    // console.log('could not copy text');
  }
}
