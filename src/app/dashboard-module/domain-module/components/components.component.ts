import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { Subject } from 'rxjs';
import { FormControl, Validators } from '@angular/forms';
import { ToastService } from 'src/app/_helpers/toast.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { takeUntil } from 'rxjs/operators';
import { NgbdModalConfirm } from 'src/app/_helpers/confirmation-dialog';
import { ConsoleLogger } from 'src/app/_helpers/console-logger';
import { RouterErrorHandler } from 'src/app/_helpers/router-error-handler';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { SwitcherComponent } from 'src/app/model/switcher-component';
import { AdminService } from 'src/app/services/admin.service';
import { ComponentService } from 'src/app/services/component.service';
import { DomainRouteService } from 'src/app/services/domain-route.service';
import { Types } from 'src/app/model/path-route';

@Component({
  selector: 'app-components',
  templateUrl: './components.component.html',
  styleUrls: [
    '../common/css/list.component.css',
    '../common/css/preview.component.css',
    './components.component.css'
  ]
})
export class ComponentsComponent implements OnInit, OnDestroy {
  private unsubscribe: Subject<void> = new Subject();

  @BlockUI() blockUI: NgBlockUI;

  components: SwitcherComponent[];

  compFormControl = new FormControl('', [
    Validators.required,
    Validators.minLength(2)
  ]);

  updatable: boolean = false;
  removable: boolean = false;
  creatable: boolean = false;

  classStatus = "card mt-4 loading";
  loading = true;
  error = '';

  constructor(
    private adminService: AdminService,
    private compService: ComponentService,
    private errorHandler: RouterErrorHandler,
    private domainRouteService: DomainRouteService,
    private toastService: ToastService,
    private _modalService: NgbModal,
    public dialog: MatDialog
  ) { }

  ngOnInit() {
    this.loadComponents();
    this.readPermissionToObject();
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  loadComponents(): void {
    this.loading = true;
    this.compService.getComponentsByDomain(this.domainRouteService.getPathElement(Types.SELECTED_DOMAIN).id)
      .pipe(takeUntil(this.unsubscribe))
      .subscribe(components => {
        this.components = components;
    }, error => {
      this.error = error;
      this.loading = false;
      this.error = this.errorHandler.doError(error);
    }, () => {
      this.loading = false;
      this.classStatus = "card mt-4 ready";
    });
  }

  readPermissionToObject(): void {
    const domain = this.domainRouteService.getPathElement(Types.SELECTED_DOMAIN);
    this.adminService.readCollabPermission(domain.id, ['CREATE', 'UPDATE', 'DELETE'], 'COMPONENT', 'name', domain.name)
      .pipe(takeUntil(this.unsubscribe)).subscribe(data => {
      if (data.length) {
        data.forEach(element => {
          if (element.action === 'UPDATE') {
            this.updatable = element.result === 'ok' ? true : false;
          } else if (element.action === 'DELETE') {
            this.removable = element.result === 'ok' ? true : false;
          } else if (element.action === 'CREATE') {
            this.creatable = element.result === 'ok' ? true : false;
          }
        });
      }
    });
  }

  createComponent() {
    const { valid } = this.compFormControl;

    if (valid) {
      this.compService.createComponent(
        this.domainRouteService.getPathElement(Types.SELECTED_DOMAIN).id, this.compFormControl.value, 'Created using Switcher Manager')
        .pipe(takeUntil(this.unsubscribe))
        .subscribe(data => {
          if (data.component) {
            this.components.push(data.component);
            this.confirmKeyCreated(data.apiKey, data.component.name);
          }
        }, error => {
          this.toastService.showError(error.error);
          ConsoleLogger.printError(error);
        });
    } else {
      this.toastService.showError('Unable to create this Component');
    }
  }

  removeComponent(selectedEnvironment: SwitcherComponent) {
    const modalConfirmation = this._modalService.open(NgbdModalConfirm);
    modalConfirmation.componentInstance.title = 'Component Removal';
    modalConfirmation.componentInstance.question = `Are you sure you want to remove ${selectedEnvironment.name}?`;
    modalConfirmation.result.then((result) => {
      if (result) {
        const component = this.components.filter(env => env.id === selectedEnvironment.id);

        this.compService.deleteComponent(selectedEnvironment.id)
        .pipe(takeUntil(this.unsubscribe))
        .subscribe(env => {
          if (env) {
            this.domainRouteService.notifyDocumentChange();
            this.components.splice(this.components.indexOf(component[0]), 1);
            this.toastService.showSuccess('Component removed with success');
          }
        }, error => {
          ConsoleLogger.printError(error);
          this.toastService.showError('Unable to remove this Component');
        });
      }
    })
  }

  editComponent(selectedComponent: SwitcherComponent): void {
    const dialogRef = this.dialog.open(ComponentEditDialog, {
      width: '350px',
      data: {
        name: selectedComponent.name,
        id: selectedComponent.id
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.unsubscribe)).subscribe(componentChanged => {
      if (componentChanged) {
        const body = {
          name: componentChanged.name
        };

        this.compService.updateComponent(selectedComponent.id, body.name).pipe(takeUntil(this.unsubscribe)).subscribe(data => {
          if (data) {
            this.domainRouteService.notifyDocumentChange();
            selectedComponent.name = componentChanged.name;
            this.toastService.showSuccess(`Component updated with success`);
          }
        }, error => {
          ConsoleLogger.printError(error);
          this.toastService.showError(`Unable to update component`);
        });
      }
    });
  }

  confirmKeyCreated(apiKey: string, componentName: string): void {
    this.dialog.open(ComponentEditDialog, {
      width: '400px',
      data: { apiKey, componentName }
    });
  }

  generateApiKey(selectedComponent: SwitcherComponent) {
    const modalConfirmation = this._modalService.open(NgbdModalConfirm);
    modalConfirmation.componentInstance.title = 'API Key';
    modalConfirmation.componentInstance.question = 'Are you sure you want to generate a new key for this component?';
    modalConfirmation.result.then((result) => {
      if (result) {
        this.blockUI.start('Generating API Key...');
        this.compService.generateApiKey(selectedComponent.id).pipe(takeUntil(this.unsubscribe)).subscribe(data => {
          if (data) {
            this.blockUI.stop();
            this.confirmKeyCreated(data.apiKey, selectedComponent.name);
          }
        }, error => {
          this.blockUI.stop();
          this.toastService.showError(`Unable to generate an API Key`);
          ConsoleLogger.printError(error);
        });
      }
    })
  }

}

@Component({
  selector: 'component.edit-dialog',
  templateUrl: 'component.edit-dialog.html',
  styleUrls: [
    '../common/css/create.component.css',
    './components.component.css'
  ]
})
export class ComponentEditDialog {

  constructor(
    public dialogRef: MatDialogRef<ComponentEditDialog>,
    private toastService: ToastService,
    @Inject(MAT_DIALOG_DATA) public data: SwitcherComponent) { }

  onSave(data: SwitcherComponent): void {
    this.dialogRef.close(data);
  }

  onCancel() {
    this.dialogRef.close();
  }

  copyKey(val: string) {
    let selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = val;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);

    this.toastService.showSuccess(`API Key copied with success`);
  }

}
