'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from 'react-bootstrap';

require('styles//DataTable.css');

class ColumnListComponent extends React.Component {
  RenderColumnsAsChecklist (column) {
    return <Checkbox checked={column.isVisible} key={column.dataKey} onChange={() => this.props.onColumnToggled(column.id)}>{column.name}</Checkbox>
  };

  render () {
    const columnsAsChecklist = this.props.headers.map((column) => this.RenderColumnsAsChecklist(column));

    return (
      <form>
        {columnsAsChecklist}
      </form>
    )
  }
}

ColumnListComponent.displayName = 'ColumnListComponent';

ColumnListComponent.propTypes = {
  headers: PropTypes.array.isRequired
};

export default ColumnListComponent;
