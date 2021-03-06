import { Component, OnInit } from '@angular/core';
import { SuppliesService } from 'src/app/services/suppplies.service';
import { RequestSuppliesService } from 'src/app/services/requestSupplies.service';
import { RequestForm } from 'src/app/models/requestForm-model';
import { LocationService } from '../../services/location.service';
import { Locality } from 'src/app/models/locality-model';

@Component({
  selector: 'app-profile',
  providers: [RequestSuppliesService],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  RequestSuppliesService: any;
  ordersData = [];
  requestForm: RequestForm = new RequestForm();
  shown: boolean;
  selectedLocality: string = '';
  allLocalitiesList: Locality[] = [];
  localityId: string;
  imageSrc: string;

  getlocality(selectedLocality) {
    this.selectedLocality = selectedLocality;
    let theselectedLocality = selectedLocality;
    let filteredLocality = this.allLocalitiesList.filter(function (localidad) {
      return localidad.localidad == theselectedLocality;
    });
    if (filteredLocality[0] !== undefined) {
      this.localityId = filteredLocality[0]._id;
    }
    this.refreshEffectorList(this.localityId);
  }

  getAllLocalities(allLocalitiesList) {
    this.allLocalitiesList = allLocalitiesList;
  }

  constructor(private json: SuppliesService) { }

  ngOnInit(): void {
    this.getSupplies();
    this.requestForm.items = [];
  }

  private getSupplies() {
    this.json.getAll().subscribe((res: any) => {
      this.ordersData = res;
    })
  }
  onOrderChange(order, event) {
    if (!event.target.checked) {
      let indexId = this.requestForm.items.map(function (e) { return e.supplyId; }).indexOf(order._id);
      this.requestForm.items.splice(indexId, 1);
      this.shown = false;
    }
    this.shown = true;
  }
  onQuantityChange(order, event) {
    let ordersAuxiliary = { supplyId: "", quantity: 0 };
    ordersAuxiliary.quantity = event.target.value;
    ordersAuxiliary.supplyId = order._id;
    this.requestForm.items.push(ordersAuxiliary);
  }
  refreshEffectorList(thelocalityId) {
    thelocalityId = this.localityId;
  }

  onFileChange(event) {
    const reader = new FileReader();
    
    if(event.target.files && event.target.files.length) {
      const [file] = event.target.files;
      reader.readAsDataURL(file);
    
      reader.onload = () => {
        this.imageSrc = reader.result as string;
      };
   
    }
  }

}
