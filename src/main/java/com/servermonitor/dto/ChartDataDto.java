package com.servermonitor.dto;

import java.util.ArrayList;
import java.util.List;

public class ChartDataDto {

    private List<String> labels = new ArrayList<>();
    private List<ServerDataset> datasets = new ArrayList<>();

    public ChartDataDto() {
    }

    public ChartDataDto(List<String> labels, List<ServerDataset> datasets) {
        this.labels = labels;
        this.datasets = datasets;
    }

    public List<String> getLabels() {
        return labels;
    }

    public void setLabels(List<String> labels) {
        this.labels = labels;
    }

    public List<ServerDataset> getDatasets() {
        return datasets;
    }

    public void setDatasets(List<ServerDataset> datasets) {
        this.datasets = datasets;
    }

    public static class ServerDataset {
        private String label;
        private List<Long> data = new ArrayList<>();
        private String borderColor;
        private String backgroundColor;
        private boolean fill = false;

        public ServerDataset() {
        }

        public ServerDataset(String label, List<Long> data, String borderColor, String backgroundColor) {
            this.label = label;
            this.data = data;
            this.borderColor = borderColor;
            this.backgroundColor = backgroundColor;
            this.fill = false;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public List<Long> getData() {
            return data;
        }

        public void setData(List<Long> data) {
            this.data = data;
        }

        public String getBorderColor() {
            return borderColor;
        }

        public void setBorderColor(String borderColor) {
            this.borderColor = borderColor;
        }

        public String getBackgroundColor() {
            return backgroundColor;
        }

        public void setBackgroundColor(String backgroundColor) {
            this.backgroundColor = backgroundColor;
        }

        public boolean isFill() {
            return fill;
        }

        public void setFill(boolean fill) {
            this.fill = fill;
        }
    }
}
