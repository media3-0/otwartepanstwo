const React = require("react");

class SelectPicker extends React.Component {
  render() {
    const { options, onChange, selected } = this.props;
    return (
      <div className="select-picker-scroll">
        {options.map(({ value, label }, idx) => (
          <div className="select-item f5" key={idx} onClick={() => onChange({ value })}>
            {/*<input type="radio" name={value} value={value} checked={isSelected} />*/}
            <div className={`circle-marker ${selected === value ? "fill" : ""}`}>
              <div className="circle-marker-inside" />
            </div>
            {label}
          </div>
        ))}
      </div>
    );
  }
}

module.exports = { SelectPicker };
